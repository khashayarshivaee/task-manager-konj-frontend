import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  NgTemplateOutlet,
} from '@angular/common';

import {
  FormsModule,
} from '@angular/forms';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  AlertController,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  checkmarkOutline,
  closeOutline,
  createOutline,
  imageOutline,
  imagesOutline,
  openOutline,
  refreshOutline,
  returnDownForwardOutline,
  sendOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  TaskComment,
  TaskCommentAttachment,
} from '../../models/task-comment.model';
import {
  TaskCommentService,
} from '../../services/task-comment.service';

interface SelectedCommentImage {
  file: File;
  previewUrl: string;
}

interface CommentAttachmentView {
  attachment: TaskCommentAttachment;
  previewUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}

interface TaskCommentView {
  comment: TaskComment;
  attachments: CommentAttachmentView[];
  replies: TaskCommentView[];
}

@Component({
  selector: 'app-task-comments',
  standalone: true,
  templateUrl:
    './task-comments.component.html',
  styleUrl:
    './task-comments.component.scss',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    IonIcon,
    IonSpinner,
  ],
})
export class TaskCommentsComponent
  implements OnInit, OnDestroy {
  @Input({
    required: true,
  })
  workspaceId!: number;

  @Input({
    required: true,
  })
  projectId!: number;

  @Input({
    required: true,
  })
  taskId!: number;

  @Output()
  readonly commentCreated =
    new EventEmitter<void>();

  private readonly commentService =
    inject(TaskCommentService);

  private readonly alertController =
    inject(AlertController);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly acceptedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  private readonly maximumImageSize =
    10 * 1024 * 1024;

  readonly maximumImages = 5;

  comments: TaskCommentView[] = [];

  commentBody = '';
  selectedCommentImages:
    SelectedCommentImage[] = [];

  replyToCommentId: number | null = null;
  replyToAuthorName = '';
  replyBody = '';
  selectedReplyImages:
    SelectedCommentImage[] = [];

  editingCommentId: number | null = null;
  editBody = '';

  isLoadingComments = false;
  isSubmittingComment = false;
  isSubmittingReply = false;
  isUpdatingComment = false;

  deletingCommentId: number | null = null;
  deletingAttachmentId: number | null = null;

  errorMessage = '';
  successMessage = '';

  constructor() {
    addIcons({
      checkmarkOutline,
      closeOutline,
      createOutline,
      imageOutline,
      imagesOutline,
      openOutline,
      refreshOutline,
      returnDownForwardOutline,
      sendOutline,
      trashOutline,
    });
  }

  get commentCount(): number {
    return this.comments.reduce(
      (
        count,
        comment,
      ) =>
        count +
        1 +
        comment.replies.length,
      0,
    );
  }

  ngOnInit(): void {
    this.loadComments();
  }

  ngOnDestroy(): void {
    this.revokeCommentUrls(
      this.comments,
    );

    this.revokeSelectedImages(
      this.selectedCommentImages,
    );

    this.revokeSelectedImages(
      this.selectedReplyImages,
    );
  }

  loadComments(): void {
    if (this.isLoadingComments) {
      return;
    }

    this.isLoadingComments = true;
    this.errorMessage = '';

    this.commentService
      .getComments(
        this.workspaceId,
        this.projectId,
        this.taskId,
      )
      .pipe(
        finalize(() => {
          this.isLoadingComments = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.revokeCommentUrls(
            this.comments,
          );

          this.comments =
            response.data.comments.map(
              (comment) =>
                this.buildCommentView(
                  comment,
                ),
            );

          this.loadAttachmentPreviews(
            this.comments,
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.comments = [];

          if (error.status === 403) {
            this.errorMessage =
              'You do not have access to these comments.';

            return;
          }

          if (error.status === 404) {
            this.errorMessage =
              'The task comments could not be found.';

            return;
          }

          this.errorMessage =
            'Unable to load comments.';
        },
      });
  }

  onCommentImagesSelected(
    event: Event,
  ): void {
    const files =
      this.readFilesFromEvent(event);

    if (files.length === 0) {
      return;
    }

    const selected =
      this.prepareSelectedImages(
        files,
        this.selectedCommentImages.length,
      );

    if (!selected) {
      return;
    }

    this.selectedCommentImages = [
      ...this.selectedCommentImages,
      ...selected,
    ];
  }

  onReplyImagesSelected(
    event: Event,
  ): void {
    const files =
      this.readFilesFromEvent(event);

    if (files.length === 0) {
      return;
    }

    const selected =
      this.prepareSelectedImages(
        files,
        this.selectedReplyImages.length,
      );

    if (!selected) {
      return;
    }

    this.selectedReplyImages = [
      ...this.selectedReplyImages,
      ...selected,
    ];
  }

  removeCommentImage(
    index: number,
  ): void {
    this.selectedCommentImages =
      this.removeSelectedImage(
        this.selectedCommentImages,
        index,
      );
  }

  removeReplyImage(
    index: number,
  ): void {
    this.selectedReplyImages =
      this.removeSelectedImage(
        this.selectedReplyImages,
        index,
      );
  }

  createComment(): void {
    if (this.isSubmittingComment) {
      return;
    }

    const body =
      this.commentBody.trim();

    if (
      body === '' &&
      this.selectedCommentImages.length === 0
    ) {
      this.errorMessage =
        'Write a comment or attach at least one image.';

      return;
    }

    this.isSubmittingComment = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.commentService
      .createComment(
        this.workspaceId,
        this.projectId,
        this.taskId,
        {
          body:
            body !== ''
              ? body
              : null,

          parentId: null,

          images:
            this.selectedCommentImages.map(
              (image) => image.file,
            ),
        },
      )
      .pipe(
        finalize(() => {
          this.isSubmittingComment = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.appendCreatedComment(
            response.data.comment,
          );

          this.commentBody = '';

          this.revokeSelectedImages(
            this.selectedCommentImages,
          );

          this.selectedCommentImages = [];

          this.successMessage =
            'Comment added successfully.';
          this.commentCreated.emit();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.handleWriteError(
            error,
            'Unable to add the comment.',
          );
        },
      });
  }

  startReply(
    comment: TaskComment,
  ): void {
    if (comment.is_deleted) {
      return;
    }

    this.cancelEdit();
    this.cancelReply();

    this.replyToCommentId =
      comment.id;

    this.replyToAuthorName =
      comment.author?.name ??
      'Deleted user';

    this.errorMessage = '';
  }

  cancelReply(): void {
    this.replyToCommentId = null;
    this.replyToAuthorName = '';
    this.replyBody = '';

    this.revokeSelectedImages(
      this.selectedReplyImages,
    );

    this.selectedReplyImages = [];
  }

  submitReply(): void {
    if (
      this.isSubmittingReply ||
      this.replyToCommentId === null
    ) {
      return;
    }

    const body =
      this.replyBody.trim();

    if (
      body === '' &&
      this.selectedReplyImages.length === 0
    ) {
      this.errorMessage =
        'Write a reply or attach at least one image.';

      return;
    }

    this.isSubmittingReply = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.commentService
      .createComment(
        this.workspaceId,
        this.projectId,
        this.taskId,
        {
          body:
            body !== ''
              ? body
              : null,

          parentId:
          this.replyToCommentId,

          images:
            this.selectedReplyImages.map(
              (image) => image.file,
            ),
        },
      )
      .pipe(
        finalize(() => {
          this.isSubmittingReply = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.appendCreatedComment(
            response.data.comment,
          );

          this.cancelReply();

          this.successMessage =
            'Reply added successfully.';
          this.commentCreated.emit();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.handleWriteError(
            error,
            'Unable to add the reply.',
          );
        },
      });
  }

  startEdit(
    comment: TaskComment,
  ): void {
    if (comment.is_deleted) {
      return;
    }

    this.cancelReply();

    this.editingCommentId =
      comment.id;

    this.editBody =
      comment.body ?? '';

    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingCommentId = null;
    this.editBody = '';
  }

  saveEdit(
    view: TaskCommentView,
  ): void {
    if (
      this.isUpdatingComment ||
      this.editingCommentId !==
      view.comment.id
    ) {
      return;
    }

    const body =
      this.editBody.trim();

    if (
      body === '' &&
      view.attachments.length === 0
    ) {
      this.errorMessage =
        'A comment must contain text or at least one image.';

      return;
    }

    this.isUpdatingComment = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.commentService
      .updateComment(
        this.workspaceId,
        this.projectId,
        this.taskId,
        view.comment.id,
        {
          body:
            body !== ''
              ? body
              : null,
        },
      )
      .pipe(
        finalize(() => {
          this.isUpdatingComment = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          view.comment = {
            ...view.comment,
            body:
            response.data.comment.body,

            is_edited:
            response.data.comment
              .is_edited,

            edited_at:
            response.data.comment
              .edited_at,

            updated_at:
            response.data.comment
              .updated_at,
          };

          this.touchComments();
          this.cancelEdit();

          this.successMessage =
            'Comment updated successfully.';
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.handleWriteError(
            error,
            'Unable to update the comment.',
          );
        },
      });
  }

  async requestDeleteComment(
    view: TaskCommentView,
  ): Promise<void> {
    if (
      view.comment.is_deleted ||
      this.deletingCommentId !== null
    ) {
      return;
    }

    const alert =
      await this.alertController.create({
        header: 'Delete comment?',

        message:
          view.replies.length > 0
            ? 'The comment text and images will be removed, but its replies will remain visible.'
            : 'This comment will be removed permanently.',

        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Delete',
            role: 'confirm',
          },
        ],
      });

    await alert.present();

    const result =
      await alert.onDidDismiss();

    if (result.role !== 'confirm') {
      return;
    }

    this.deleteComment(view);
  }

  async requestDeleteAttachment(
    view: TaskCommentView,
    attachmentView:
      CommentAttachmentView,
  ): Promise<void> {
    if (
      this.deletingAttachmentId !== null
    ) {
      return;
    }

    const alert =
      await this.alertController.create({
        header: 'Delete image?',

        message:
          `Remove "${attachmentView.attachment.original_name}" from this comment?`,

        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Delete',
            role: 'confirm',
          },
        ],
      });

    await alert.present();

    const result =
      await alert.onDidDismiss();

    if (result.role !== 'confirm') {
      return;
    }

    this.deleteAttachment(
      view,
      attachmentView,
    );
  }

  openAttachment(
    previewUrl: string | null,
  ): void {
    if (!previewUrl) {
      return;
    }

    window.open(
      previewUrl,
      '_blank',
      'noopener,noreferrer',
    );
  }

  formatDate(
    value: string | null,
  ): string {
    if (!value) {
      return 'Just now';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      },
    ).format(date);
  }

  formatFileSize(
    size: number,
  ): string {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(
        size / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  getInitials(
    name: string | null | undefined,
  ): string {
    const normalized =
      name?.trim() || '?';

    return normalized
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0).toUpperCase(),
      )
      .join('');
  }

  private buildCommentView(
    comment: TaskComment,
  ): TaskCommentView {
    return {
      comment,

      attachments:
        comment.attachments.map(
          (attachment) => ({
            attachment,
            previewUrl: null,
            isLoading: true,
            hasError: false,
          }),
        ),

      replies:
        comment.replies.map(
          (reply) =>
            this.buildCommentView(
              reply,
            ),
        ),
    };
  }

  private appendCreatedComment(
    comment: TaskComment,
  ): void {
    const view =
      this.buildCommentView(comment);

    if (comment.parent_id === null) {
      this.comments = [
        ...this.comments,
        view,
      ];

      this.loadAttachmentPreviews([
        view,
      ]);

      return;
    }

    const parent =
      this.findCommentView(
        comment.parent_id,
      );

    if (!parent) {
      this.loadComments();

      return;
    }

    parent.replies = [
      ...parent.replies,
      view,
    ];

    this.touchComments();

    this.loadAttachmentPreviews([
      view,
    ]);
  }

  private loadAttachmentPreviews(
    views: TaskCommentView[],
  ): void {
    for (const view of views) {
      for (
        const attachmentView of
        view.attachments
        ) {
        this.loadAttachmentPreview(
          view.comment.id,
          attachmentView
            .attachment.id,
        );
      }

      this.loadAttachmentPreviews(
        view.replies,
      );
    }
  }

  private loadAttachmentPreview(
    commentId: number,
    attachmentId: number,
  ): void {
    this.commentService
      .getAttachmentFile(
        this.workspaceId,
        this.projectId,
        this.taskId,
        commentId,
        attachmentId,
      )
      .pipe(
        finalize(() => {
          const attachmentView =
            this.findAttachmentView(
              commentId,
              attachmentId,
            );

          if (!attachmentView) {
            return;
          }

          attachmentView.isLoading =
            false;

          attachmentView.hasError =
            attachmentView.previewUrl ===
            null;

          this.touchComments();
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          const previewUrl =
            URL.createObjectURL(blob);

          const attachmentView =
            this.findAttachmentView(
              commentId,
              attachmentId,
            );

          if (!attachmentView) {
            URL.revokeObjectURL(
              previewUrl,
            );

            return;
          }

          if (
            attachmentView.previewUrl
          ) {
            URL.revokeObjectURL(
              attachmentView.previewUrl,
            );
          }

          attachmentView.previewUrl =
            previewUrl;

          attachmentView.isLoading =
            false;

          attachmentView.hasError =
            false;

          this.touchComments();
        },

        error: () => {
          const attachmentView =
            this.findAttachmentView(
              commentId,
              attachmentId,
            );

          if (!attachmentView) {
            return;
          }

          attachmentView.previewUrl =
            null;

          attachmentView.isLoading =
            false;

          attachmentView.hasError =
            true;

          this.touchComments();
        },
      });
  }

  private deleteComment(
    view: TaskCommentView,
  ): void {
    this.deletingCommentId =
      view.comment.id;

    this.errorMessage = '';
    this.successMessage = '';

    this.commentService
      .deleteComment(
        this.workspaceId,
        this.projectId,
        this.taskId,
        view.comment.id,
      )
      .pipe(
        finalize(() => {
          this.deletingCommentId = null;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.revokeAttachmentUrls(
            view.attachments,
          );

          view.attachments = [];

          view.comment = {
            ...view.comment,
            body: null,
            is_deleted: true,
          };

          this.touchComments();

          if (
            this.editingCommentId ===
            view.comment.id
          ) {
            this.cancelEdit();
          }

          this.successMessage =
            'Comment deleted successfully.';
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.handleWriteError(
            error,
            'Unable to delete the comment.',
          );
        },
      });
  }

  private deleteAttachment(
    view: TaskCommentView,
    attachmentView:
      CommentAttachmentView,
  ): void {
    this.deletingAttachmentId =
      attachmentView.attachment.id;

    this.errorMessage = '';
    this.successMessage = '';

    this.commentService
      .deleteAttachment(
        this.workspaceId,
        this.projectId,
        this.taskId,
        view.comment.id,
        attachmentView.attachment.id,
      )
      .pipe(
        finalize(() => {
          this.deletingAttachmentId =
            null;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          if (
            attachmentView.previewUrl
          ) {
            URL.revokeObjectURL(
              attachmentView.previewUrl,
            );
          }

          view.attachments =
            view.attachments.filter(
              (currentAttachment) =>
                currentAttachment
                  .attachment.id !==
                attachmentView
                  .attachment.id,
            );

          view.comment = {
            ...view.comment,

            attachments:
              view.comment.attachments
                .filter(
                  (attachment) =>
                    attachment.id !==
                    attachmentView
                      .attachment.id,
                ),
          };

          this.touchComments();

          this.successMessage =
            'Comment image deleted successfully.';
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.handleWriteError(
            error,
            'Unable to delete the image.',
          );
        },
      });
  }

  private readFilesFromEvent(
    event: Event,
  ): File[] {
    const input =
      event.target as HTMLInputElement;

    const files = Array.from(
      input.files ?? [],
    );

    input.value = '';

    return files;
  }

  private prepareSelectedImages(
    files: File[],
    currentCount: number,
  ): SelectedCommentImage[] | null {
    this.errorMessage = '';
    this.successMessage = '';

    if (
      currentCount +
      files.length >
      this.maximumImages
    ) {
      this.errorMessage =
        'You can attach up to 5 images.';

      return null;
    }

    if (
      files.some(
        (file) =>
          !this.acceptedImageTypes
            .includes(file.type),
      )
    ) {
      this.errorMessage =
        'Only JPG, PNG and WebP images are allowed.';

      return null;
    }

    if (
      files.some(
        (file) =>
          file.size >
          this.maximumImageSize,
      )
    ) {
      this.errorMessage =
        'Each image must be smaller than 10 MB.';

      return null;
    }

    return files.map(
      (file) => ({
        file,
        previewUrl:
          URL.createObjectURL(file),
      }),
    );
  }

  private removeSelectedImage(
    images: SelectedCommentImage[],
    index: number,
  ): SelectedCommentImage[] {
    const image = images[index];

    if (!image) {
      return images;
    }

    URL.revokeObjectURL(
      image.previewUrl,
    );

    return images.filter(
      (_, currentIndex) =>
        currentIndex !== index,
    );
  }

  private findCommentView(
    commentId: number,
    views: TaskCommentView[] =
      this.comments,
  ): TaskCommentView | null {
    for (const view of views) {
      if (
        view.comment.id ===
        commentId
      ) {
        return view;
      }

      const reply =
        this.findCommentView(
          commentId,
          view.replies,
        );

      if (reply) {
        return reply;
      }
    }

    return null;
  }

  private findAttachmentView(
    commentId: number,
    attachmentId: number,
  ): CommentAttachmentView | null {
    const comment =
      this.findCommentView(
        commentId,
      );

    return (
      comment?.attachments.find(
        (attachment) =>
          attachment.attachment.id ===
          attachmentId,
      ) ?? null
    );
  }

  private touchComments(): void {
    this.comments = [
      ...this.comments,
    ];
  }

  private revokeCommentUrls(
    views: TaskCommentView[],
  ): void {
    for (const view of views) {
      this.revokeAttachmentUrls(
        view.attachments,
      );

      this.revokeCommentUrls(
        view.replies,
      );
    }
  }

  private revokeAttachmentUrls(
    attachments:
      CommentAttachmentView[],
  ): void {
    for (
      const attachment of attachments
      ) {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(
          attachment.previewUrl,
        );
      }
    }
  }

  private revokeSelectedImages(
    images: SelectedCommentImage[],
  ): void {
    for (const image of images) {
      URL.revokeObjectURL(
        image.previewUrl,
      );

    }
  }

  private handleWriteError(
    error: HttpErrorResponse,
    fallback: string,
  ): void {
    if (error.status === 422) {
      this.errorMessage =
        error.error?.message ||
        'Please review the submitted information.';

      return;
    }

    if (error.status === 403) {
      this.errorMessage =
        'You do not have permission to perform this action.';

      return;
    }

    if (error.status === 404) {
      this.errorMessage =
        'The requested comment could not be found.';

      return;
    }

    this.errorMessage = fallback;
  }
}
