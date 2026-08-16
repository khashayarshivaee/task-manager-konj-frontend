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
  micOutline,
  stopCircleOutline,
  closeOutline,
  createOutline,
  playOutline,
  pauseOutline,
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

import {
  RealtimeService,
  type TaskCommentDeletedEvent,
} from '../../../core/services/realtime.service';

interface SelectedCommentImage {
  file: File;
  previewUrl: string;
}

interface SelectedVoiceRecording {
  file: File;
  previewUrl: string;
  durationMs: number;
}

type VoiceRecordingTarget =
  | 'comment'
  | 'reply';

interface CommentAttachmentView {
  attachment: TaskCommentAttachment;
  previewUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}

interface TaskCommentView {
  comment: TaskComment;

  attachments: CommentAttachmentView[];

  voicePreviewUrl: string | null;
  isVoiceLoading: boolean;
  hasVoiceError: boolean;

  isVoicePlaying: boolean;
  voiceCurrentTimeMs: number;
  voiceAudio: HTMLAudioElement | null;

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

  private readonly realtimeService =
    inject(RealtimeService);

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

  selectedCommentVoice:
    SelectedVoiceRecording | null = null;

  commentVoiceElapsedMs = 0;
  isRecordingCommentVoice = false;

  replyToCommentId: number | null = null;
  replyToAuthorName = '';
  replyBody = '';

  selectedReplyImages:
    SelectedCommentImage[] = [];

  selectedReplyVoice:
    SelectedVoiceRecording | null = null;

  replyVoiceElapsedMs = 0;
  isRecordingReplyVoice = false;

  editingCommentId: number | null = null;
  editBody = '';

  isLoadingComments = false;
  isSubmittingComment = false;
  isSubmittingReply = false;
  isUpdatingComment = false;

  private isMarkingCommentsRead = false;

  private shouldMarkCommentsReadAgain =
    false;


  private activeMediaRecorder:
    MediaRecorder | null = null;

  private activeVoiceStream:
    MediaStream | null = null;

  private activeVoiceTarget:
    VoiceRecordingTarget | null = null;

  private voiceChunks: Blob[] = [];

  private voiceRecordingStartedAt = 0;

  private voiceTimerId:
    ReturnType<typeof setInterval> | null =
    null;

  private discardActiveVoice = false;

  private readonly maximumVoiceDurationMs =
    180000;

  deletingCommentId: number | null = null;
  deletingAttachmentId: number | null = null;
  deletingVoiceCommentId: number | null = null;

  errorMessage = '';
  successMessage = '';

  constructor() {
    addIcons({
      checkmarkOutline,
      micOutline,
      stopCircleOutline,
      closeOutline,
      createOutline,
      playOutline,
      pauseOutline,
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
    this.subscribeToRealtime();

    this.realtimeService.joinTask(
      this.taskId,
    );

    this.loadComments();
  }
  ngOnDestroy(): void {
    this.realtimeService.leaveTask();
    this.revokeCommentUrls(
      this.comments,
    );

    this.revokeSelectedImages(
      this.selectedCommentImages,
    );

    this.revokeSelectedImages(
      this.selectedReplyImages,
    );

    this.cancelActiveVoiceRecording();

    this.revokeSelectedVoice(
      this.selectedCommentVoice,
    );

    this.revokeSelectedVoice(
      this.selectedReplyVoice,
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
          this.markCommentsAsRead();

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

  async startCommentVoiceRecording(): Promise<void> {
    await this.startVoiceRecording(
      'comment',
    );
  }

  stopCommentVoiceRecording(): void {
    this.stopVoiceRecording(
      'comment',
    );
  }

  cancelCommentVoiceRecording(): void {
    if (
      this.activeVoiceTarget ===
      'comment'
    ) {
      this.cancelActiveVoiceRecording();
    }

    this.revokeSelectedVoice(
      this.selectedCommentVoice,
    );

    this.selectedCommentVoice = null;
    this.commentVoiceElapsedMs = 0;
  }

  async startReplyVoiceRecording(): Promise<void> {
    await this.startVoiceRecording(
      'reply',
    );
  }

  stopReplyVoiceRecording(): void {
    this.stopVoiceRecording(
      'reply',
    );
  }

  cancelReplyVoiceRecording(): void {
    if (
      this.activeVoiceTarget ===
      'reply'
    ) {
      this.cancelActiveVoiceRecording();
    }

    this.revokeSelectedVoice(
      this.selectedReplyVoice,
    );

    this.selectedReplyVoice = null;
    this.replyVoiceElapsedMs = 0;
  }

  formatVoiceDuration(
    durationMs: number,
  ): string {
    const totalSeconds =
      Math.floor(durationMs / 1000);

    const minutes =
      Math.floor(totalSeconds / 60);

    const seconds =
      totalSeconds % 60;

    return (
      `${minutes}:` +
      seconds
        .toString()
        .padStart(
          2,
          '0',
        )
    );
  }

  toggleVoicePlayback(
    view: TaskCommentView,
  ): void {
    if (!view.voicePreviewUrl) {
      return;
    }

    if (!view.voiceAudio) {
      const audio =
        new Audio(
          view.voicePreviewUrl,
        );

      audio.preload = 'metadata';

      audio.ontimeupdate = () => {
        view.voiceCurrentTimeMs =
          Math.round(
            audio.currentTime * 1000,
          );

        this.touchComments();
      };

      audio.onended = () => {
        view.isVoicePlaying = false;

        view.voiceCurrentTimeMs = 0;

        audio.currentTime = 0;

        this.touchComments();
      };

      audio.onpause = () => {
        view.isVoicePlaying = false;

        this.touchComments();
      };

      audio.onplay = () => {
        view.isVoicePlaying = true;

        this.touchComments();
      };

      view.voiceAudio = audio;
    }

    if (view.voiceAudio.paused) {
      this.pauseOtherVoicePlayers(
        view.comment.id,
      );

      void view.voiceAudio.play();
    } else {
      view.voiceAudio.pause();
    }
  }
  seekVoice(
    view: TaskCommentView,
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const value =
      Number(input.value);

    if (
      Number.isNaN(value) ||
      !view.voiceAudio
    ) {
      return;
    }

    view.voiceCurrentTimeMs =
      value;

    view.voiceAudio.currentTime =
      value / 1000;
  }

  createComment(): void {
    if (this.isSubmittingComment) {
      return;
    }

    const body =
      this.commentBody.trim();

    if (
      body === '' &&
      this.selectedCommentImages.length === 0 &&
      this.selectedCommentVoice === null
    ) {
      this.errorMessage =
        'Write a comment, attach an image, or record a voice message.';

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
          voice:
            this.selectedCommentVoice?.file ??
            null,

          voiceDurationMs:
            this.selectedCommentVoice
              ?.durationMs ??
            null,
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

          this.revokeSelectedVoice(
            this.selectedCommentVoice,
          );

          this.selectedCommentVoice = null;
          this.commentVoiceElapsedMs = 0;

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
    this.cancelReplyVoiceRecording();
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
      this.selectedReplyImages.length === 0 &&
      this.selectedReplyVoice === null
    ) {
      this.errorMessage =
        'Write a reply, attach an image, or record a voice message.';

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
          voice:
            this.selectedReplyVoice?.file ??
            null,

          voiceDurationMs:
            this.selectedReplyVoice
              ?.durationMs ??
            null,
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
      view.attachments.length === 0 &&
      view.comment.voice_message === null
    ) {
      this.errorMessage =
        'A comment must contain text, at least one image, or a voice message.';

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

  async requestDeleteVoice(
    view: TaskCommentView,
  ): Promise<void> {
    if (
      view.comment.is_deleted ||
      view.comment.voice_message === null ||
      this.deletingVoiceCommentId !== null
    ) {
      return;
    }

    const alert =
      await this.alertController.create({
        header: 'Delete voice message?',

        message:
          'Remove this voice message from the comment?',

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

    this.deleteVoice(
      view,
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

  private subscribeToRealtime(): void {
    this.realtimeService
      .commentCreated$
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((event) => {
        if (
          !this.isCurrentTaskEvent(
            event,
          )
        ) {
          return;
        }

        this.appendCreatedComment(
          event.comment,
        );

        /*
         * The discussion is currently open,
         * therefore an incoming comment is
         * immediately considered read.
         */
        this.markCommentsAsRead();
      });

    this.realtimeService
      .commentUpdated$
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((event) => {
        if (
          !this.isCurrentTaskEvent(
            event,
          )
        ) {
          return;
        }

        this.applyRealtimeCommentUpdate(
          event.comment,
        );
      });

    this.realtimeService
      .commentDeleted$
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((event) => {
        if (
          !this.isCurrentTaskEvent(
            event,
          )
        ) {
          return;
        }

        this.applyRealtimeCommentDelete(
          event,
        );
      });
  }

  private isCurrentTaskEvent(
    event: {
      workspace_id: number;
      project_id: number;
      task_id: number;
    },
  ): boolean {
    return (
      event.workspace_id ===
      this.workspaceId &&
      event.project_id ===
      this.projectId &&
      event.task_id ===
      this.taskId
    );
  }

  private applyRealtimeCommentUpdate(
    comment: TaskComment,
  ): void {
    const existingView =
      this.findCommentView(
        comment.id,
      );

    if (!existingView) {
      this.loadComments();

      return;
    }

    this.replaceCommentView(
      existingView,
      comment,
    );
  }

  private applyRealtimeCommentDelete(
    event: TaskCommentDeletedEvent,
  ): void {
    const existingView =
      this.findCommentView(
        event.comment_id,
      );

    if (!existingView) {
      return;
    }

    this.revokeAttachmentUrls(
      existingView.attachments,
    );

    this.clearVoiceView(
      existingView,
    );

    existingView.attachments = [];

    existingView.comment = {
      ...existingView.comment,

      body: null,

      is_deleted: true,

      attachments: [],

      voice_message: null,
    };

    if (
      this.editingCommentId ===
      event.comment_id
    ) {
      this.cancelEdit();
    }

    if (
      this.replyToCommentId ===
      event.comment_id
    ) {
      this.cancelReply();
    }

    this.touchComments();
  }

  private replaceCommentView(
    view: TaskCommentView,
    comment: TaskComment,
  ): void {
    this.revokeAttachmentUrls(
      view.attachments,
    );
    this.clearVoiceView(
      view,
    );

    this.revokeCommentUrls(
      view.replies,
    );

    const replacement =
      this.buildCommentView(
        comment,
      );

    view.comment =
      replacement.comment;

    view.attachments =
      replacement.attachments;

    view.replies =
      replacement.replies;

    this.touchComments();

    this.loadAttachmentPreviews([
      view,
    ]);
  }

  private markCommentsAsRead(): void {
    if (this.isMarkingCommentsRead) {
      this.shouldMarkCommentsReadAgain =
        true;

      return;
    }

    this.isMarkingCommentsRead = true;

    this.commentService
      .markCommentsRead(
        this.workspaceId,
        this.projectId,
        this.taskId,
      )
      .pipe(
        finalize(() => {
          this.isMarkingCommentsRead =
            false;

          if (
            this.shouldMarkCommentsReadAgain
          ) {
            this.shouldMarkCommentsReadAgain =
              false;

            this.markCommentsAsRead();
          }
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        error: () => {
          /*
           * Reading comments is a background
           * synchronization operation. A failure
           * should not replace the discussion UI
           * with an error message.
           */
        },
      });
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

      voicePreviewUrl: null,

      isVoicePlaying: false,

      voiceCurrentTimeMs: 0,

      voiceAudio: null,

      isVoiceLoading:
        comment.voice_message !== null,

      hasVoiceError: false,

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
    /*
     * The creator receives both the HTTP
     * response and the WebSocket event.
     * Update the existing item instead of
     * displaying it twice.
     */
    const existingView =
      this.findCommentView(
        comment.id,
      );

    if (existingView) {
      this.replaceCommentView(
        existingView,
        comment,
      );

      return;
    }

    const view =
      this.buildCommentView(
        comment,
      );

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

      if (
        view.comment.voice_message !== null
      ) {
        this.loadVoicePreview(
          view.comment.id,
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

  private loadVoicePreview(
    commentId: number,
  ): void {
    const view =
      this.findCommentView(
        commentId,
      );

    if (
      !view ||
      view.comment.voice_message === null
    ) {
      return;
    }

    view.isVoiceLoading = true;
    view.hasVoiceError = false;

    this.commentService
      .getVoiceFile(
        this.workspaceId,
        this.projectId,
        this.taskId,
        commentId,
      )
      .pipe(
        finalize(() => {
          const currentView =
            this.findCommentView(
              commentId,
            );

          if (!currentView) {
            return;
          }

          currentView.isVoiceLoading =
            false;

          this.touchComments();
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (blob) => {
          const previewUrl =
            URL.createObjectURL(
              blob,
            );

          const currentView =
            this.findCommentView(
              commentId,
            );

          if (!currentView) {
            URL.revokeObjectURL(
              previewUrl,
            );

            return;
          }

          if (
            currentView.voicePreviewUrl
          ) {
            URL.revokeObjectURL(
              currentView.voicePreviewUrl,
            );
          }

          currentView.voicePreviewUrl =
            previewUrl;

          currentView.hasVoiceError =
            false;

          this.touchComments();
        },

        error: () => {
          const currentView =
            this.findCommentView(
              commentId,
            );

          if (!currentView) {
            return;
          }

          currentView.voicePreviewUrl =
            null;

          currentView.hasVoiceError =
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
          this.deletingCommentId =
            null;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: () => {
          this.revokeAttachmentUrls(
            view.attachments,
          );

          this.clearVoiceView(
            view,
          );

          view.attachments = [];

          view.comment = {
            ...view.comment,

            body: null,

            is_deleted: true,

            attachments: [],

            voice_message: null,
          };

          if (
            this.editingCommentId ===
            view.comment.id
          ) {
            this.cancelEdit();
          }

          if (
            this.replyToCommentId ===
            view.comment.id
          ) {
            this.cancelReply();
          }

          this.touchComments();

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

  private deleteVoice(
    view: TaskCommentView,
  ): void {
    this.deletingVoiceCommentId =
      view.comment.id;

    this.errorMessage = '';
    this.successMessage = '';

    this.commentService
      .deleteVoice(
        this.workspaceId,
        this.projectId,
        this.taskId,
        view.comment.id,
      )
      .pipe(
        finalize(() => {
          this.deletingVoiceCommentId =
            null;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: () => {
          this.clearVoiceView(
            view,
          );

          view.comment = {
            ...view.comment,

            voice_message: null,
          };

          this.touchComments();

          this.successMessage =
            'Voice message deleted successfully.';
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.handleWriteError(
            error,
            'Unable to delete the voice message.',
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

  private clearVoiceView(
    view: TaskCommentView,
  ): void {
    if (view.voiceAudio) {
      view.voiceAudio.pause();
      view.voiceAudio.src = '';
      view.voiceAudio = null;
    }

    if (view.voicePreviewUrl) {
      URL.revokeObjectURL(
        view.voicePreviewUrl,
      );

      view.voicePreviewUrl = null;
    }

    view.isVoicePlaying = false;
    view.voiceCurrentTimeMs = 0;
    view.isVoiceLoading = false;
    view.hasVoiceError = false;
  }

  private revokeCommentUrls(
    views: TaskCommentView[],
  ): void {
    for (const view of views) {
      this.revokeAttachmentUrls(
        view.attachments,
      );

      this.clearVoiceView(
        view,
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

  private async startVoiceRecording(
    target: VoiceRecordingTarget,
  ): Promise<void> {
    if (this.activeMediaRecorder) {
      return;
    }

    if (
      !navigator.mediaDevices
        ?.getUserMedia ||
      typeof MediaRecorder ===
      'undefined'
    ) {
      this.errorMessage =
        'Voice recording is not supported on this device.';

      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    try {
      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true,
          });

      const recorder =
        new MediaRecorder(
          stream,
        );

      this.activeVoiceStream =
        stream;

      this.activeMediaRecorder =
        recorder;

      this.activeVoiceTarget =
        target;

      this.voiceChunks = [];

      this.discardActiveVoice =
        false;

      this.voiceRecordingStartedAt =
        Date.now();

      if (target === 'comment') {
        this.revokeSelectedVoice(
          this.selectedCommentVoice,
        );

        this.selectedCommentVoice =
          null;

        this.commentVoiceElapsedMs =
          0;

        this.isRecordingCommentVoice =
          true;
      } else {
        this.revokeSelectedVoice(
          this.selectedReplyVoice,
        );

        this.selectedReplyVoice =
          null;

        this.replyVoiceElapsedMs =
          0;

        this.isRecordingReplyVoice =
          true;
      }

      recorder.ondataavailable = (
        event: BlobEvent,
      ) => {
        if (event.data.size > 0) {
          this.voiceChunks.push(
            event.data,
          );
        }
      };

      recorder.onstop = () => {
        this.finishVoiceRecording();
      };

      recorder.start();

      this.voiceTimerId =
        setInterval(
          () => {
            const elapsed =
              Math.min(
                Date.now() -
                this.voiceRecordingStartedAt,
                this.maximumVoiceDurationMs,
              );

            if (
              this.activeVoiceTarget ===
              'comment'
            ) {
              this.commentVoiceElapsedMs =
                elapsed;
            } else if (
              this.activeVoiceTarget ===
              'reply'
            ) {
              this.replyVoiceElapsedMs =
                elapsed;
            }

            if (
              elapsed >=
              this.maximumVoiceDurationMs
            ) {
              this.stopVoiceRecording(
                this.activeVoiceTarget,
              );
            }
          },
          250,
        );
    } catch {
      this.releaseVoiceStream();

      this.errorMessage =
        'Microphone access is required to record a voice message.';
    }
  }

  private stopVoiceRecording(
    target: VoiceRecordingTarget | null,
  ): void {
    if (
      target === null ||
      this.activeVoiceTarget !== target ||
      !this.activeMediaRecorder ||
      this.activeMediaRecorder.state ===
      'inactive'
    ) {
      return;
    }

    this.activeMediaRecorder.stop();
  }

  private cancelActiveVoiceRecording(): void {
    this.discardActiveVoice = true;

    if (
      this.activeMediaRecorder &&
      this.activeMediaRecorder.state !==
      'inactive'
    ) {
      this.activeMediaRecorder.stop();

      return;
    }

    this.resetVoiceRecorder();
  }

  private finishVoiceRecording(): void {
    const target =
      this.activeVoiceTarget;

    const recorder =
      this.activeMediaRecorder;

    const durationMs =
      Math.min(
        Date.now() -
        this.voiceRecordingStartedAt,
        this.maximumVoiceDurationMs,
      );

    if (
      !this.discardActiveVoice &&
      target !== null &&
      recorder !== null &&
      this.voiceChunks.length > 0
    ) {
      const mimeType =
        recorder.mimeType ||
        this.voiceChunks[0]?.type ||
        'audio/webm';

      const blob =
        new Blob(
          this.voiceChunks,
          {
            type: mimeType,
          },
        );

      const extension =
        this.voiceExtensionFromMimeType(
          mimeType,
        );

      const file =
        new File(
          [blob],
          `voice-message.${extension}`,
          {
            type: mimeType,
          },
        );

      const selectedVoice: SelectedVoiceRecording =
        {
          file,
          previewUrl:
            URL.createObjectURL(
              blob,
            ),
          durationMs:
            Math.max(
              1,
              Math.round(
                durationMs,
              ),
            ),
        };

      if (target === 'comment') {
        this.selectedCommentVoice =
          selectedVoice;

        this.commentVoiceElapsedMs =
          selectedVoice.durationMs;
      } else {
        this.selectedReplyVoice =
          selectedVoice;

        this.replyVoiceElapsedMs =
          selectedVoice.durationMs;
      }
    }

    this.resetVoiceRecorder();
  }

  private resetVoiceRecorder(): void {
    if (
      this.voiceTimerId !== null
    ) {
      clearInterval(
        this.voiceTimerId,
      );

      this.voiceTimerId = null;
    }

    this.releaseVoiceStream();

    this.activeMediaRecorder = null;
    this.activeVoiceTarget = null;
    this.voiceChunks = [];
    this.voiceRecordingStartedAt = 0;
    this.discardActiveVoice = false;

    this.isRecordingCommentVoice =
      false;

    this.isRecordingReplyVoice =
      false;
  }

  private releaseVoiceStream(): void {
    if (!this.activeVoiceStream) {
      return;
    }

    for (
      const track of
      this.activeVoiceStream.getTracks()
      ) {
      track.stop();
    }

    this.activeVoiceStream = null;
  }

  private revokeSelectedVoice(
    voice:
      | SelectedVoiceRecording
      | null,
  ): void {
    if (!voice) {
      return;
    }

    URL.revokeObjectURL(
      voice.previewUrl,
    );
  }

  private voiceExtensionFromMimeType(
    mimeType: string,
  ): string {
    if (
      mimeType.includes(
        'mp4',
      ) ||
      mimeType.includes(
        'm4a',
      )
    ) {
      return 'm4a';
    }

    if (
      mimeType.includes(
        'mpeg',
      )
    ) {
      return 'mp3';
    }

    if (
      mimeType.includes(
        'aac',
      )
    ) {
      return 'aac';
    }

    return 'webm';
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

  private pauseOtherVoicePlayers(
    activeCommentId: number,
    views: TaskCommentView[] =
    this.comments,
  ): void {
    for (const view of views) {
      if (
        view.comment.id !==
        activeCommentId &&
        view.voiceAudio
      ) {
        view.voiceAudio.pause();
      }

      this.pauseOtherVoicePlayers(
        activeCommentId,
        view.replies,
      );
    }
  }
}
