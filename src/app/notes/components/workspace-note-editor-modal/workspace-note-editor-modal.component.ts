import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  IonContent,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';

import {
  addIcons,
} from 'ionicons';

import {
  closeOutline,
  cloudUploadOutline,
  eyeOutline,
  imageOutline,
  pinOutline,
  trashOutline,
} from 'ionicons/icons';

import {
  firstValueFrom,
} from 'rxjs';

import {
  Workspace,
} from '../../../workspaces/models/workspace.model';

import {
  WorkspaceNote,
  WorkspaceNoteAttachment,
} from '../../models/workspace-note.model';

import {
  WorkspaceNoteService,
} from '../../services/workspace-note.service';

interface SelectedImagePreview {
  file: File;
  url: string;
}

@Component({
  selector:
    'app-workspace-note-editor-modal',

  standalone: true,

  templateUrl:
    './workspace-note-editor-modal.component.html',

  styleUrl:
    './workspace-note-editor-modal.component.scss',

  imports: [
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class WorkspaceNoteEditorModalComponent
  implements OnInit, OnDestroy {
  private readonly formBuilder =
    inject(FormBuilder);

  private readonly noteService =
    inject(WorkspaceNoteService);

  private readonly modalController =
    inject(ModalController);

  @Input({
    required: true,
  })
  workspace!: Workspace;

  @Input()
  note: WorkspaceNote | null =
    null;

  @Input()
  editable = true;

  readonly noteForm =
    this.formBuilder.nonNullable.group({
      title: [
        '',
        [
          Validators.required,
          Validators.maxLength(180),
        ],
      ],

      content: [
        '',
      ],

      is_pinned: [
        false,
      ],
    });

  selectedImages:
    SelectedImagePreview[] = [];

  attachmentPreviewUrls:
    Record<number, string> = {};

  isLoadingImages = false;
  isSubmitting = false;
  isDeletingNote = false;

  deletingAttachmentId:
    number | null = null;

  showDeleteConfirmation = false;

  errorMessage = '';

  constructor() {
    addIcons({
      closeOutline,
      cloudUploadOutline,
      eyeOutline,
      imageOutline,
      pinOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    if (this.note) {
      this.noteForm.setValue({
        title:
        this.note.title,

        content:
          this.note.content ?? '',

        is_pinned:
        this.note.is_pinned,
      });

      void this.loadAttachmentPreviews();
    }

    if (!this.editable) {
      this.noteForm.disable();
    }
  }

  ngOnDestroy(): void {
    this.revokeSelectedImageUrls();
    this.revokeAttachmentUrls();
  }

  get isCreateMode(): boolean {
    return this.note === null;
  }

  get existingAttachments():
    WorkspaceNoteAttachment[] {
    return this.note?.attachments ?? [];
  }

  get totalImageCount(): number {
    return (
      this.existingAttachments.length +
      this.selectedImages.length
    );
  }

  async close(): Promise<void> {
    if (
      this.isSubmitting ||
      this.isDeletingNote ||
      this.deletingAttachmentId !== null
    ) {
      return;
    }

    await this.modalController.dismiss(
      null,
      'cancel',
    );
  }

  onImagesSelected(
    event: Event,
  ): void {
    if (!this.editable) {
      return;
    }

    const input =
      event.target as HTMLInputElement;

    const files =
      Array.from(
        input.files ?? [],
      );

    input.value = '';

    if (files.length === 0) {
      return;
    }

    this.errorMessage = '';

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    const maximumFileSize =
      8 * 1024 * 1024;

    const validFiles =
      files.filter((file) => {
        return (
          allowedTypes.includes(
            file.type,
          ) &&
          file.size <=
          maximumFileSize
        );
      });

    if (
      validFiles.length !==
      files.length
    ) {
      this.errorMessage =
        'Images must be JPG, PNG or WebP and no larger than 8 MB.';
    }

    const remainingSlots =
      Math.max(
        0,
        10 - this.totalImageCount,
      );

    if (
      validFiles.length >
      remainingSlots
    ) {
      this.errorMessage =
        'A note can contain up to 10 images.';
    }

    validFiles
      .slice(
        0,
        remainingSlots,
      )
      .forEach((file) => {
        this.selectedImages.push({
          file,
          url:
            URL.createObjectURL(
              file,
            ),
        });
      });
  }

  removeSelectedImage(
    index: number,
  ): void {
    if (!this.editable) {
      return;
    }

    const preview =
      this.selectedImages[index];

    if (!preview) {
      return;
    }

    URL.revokeObjectURL(
      preview.url,
    );

    this.selectedImages.splice(
      index,
      1,
    );
  }

  async deleteAttachment(
    attachment:
      WorkspaceNoteAttachment,
  ): Promise<void> {
    if (
      !this.editable ||
      !this.note ||
      this.deletingAttachmentId !== null
    ) {
      return;
    }

    this.errorMessage = '';

    this.deletingAttachmentId =
      attachment.id;

    try {
      await firstValueFrom(
        this.noteService
          .deleteAttachment(
            this.workspace.id,
            this.note.id,
            attachment.id,
          ),
      );

      const previewUrl =
        this.attachmentPreviewUrls[
          attachment.id
          ];

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }

      delete this
        .attachmentPreviewUrls[
        attachment.id
        ];

      this.note = {
        ...this.note,

        attachments:
          this.note.attachments
            .filter(
              (item) =>
                item.id !==
                attachment.id,
            ),
      };
    } catch (error) {
      this.errorMessage =
        this.resolveErrorMessage(
          error,
          'Unable to delete this image.',
        );
    } finally {
      this.deletingAttachmentId =
        null;
    }
  }

  async submit(): Promise<void> {
    if (
      !this.editable ||
      this.isSubmitting
    ) {
      return;
    }

    if (this.noteForm.invalid) {
      this.noteForm.markAllAsTouched();

      return;
    }

    const title =
      this.noteForm.controls
        .title.value
        .trim();

    if (!title) {
      this.noteForm.controls
        .title.setErrors({
        required: true,
      });

      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const wasCreating =
      this.note === null;

    try {
      const payload = {
        title,

        content:
          this.noteForm.controls
            .content.value
            .trim() || null,

        is_pinned:
        this.noteForm.controls
          .is_pinned.value,
      };

      if (wasCreating) {
        const response =
          await firstValueFrom(
            this.noteService
              .createNote(
                this.workspace.id,
                payload,
              ),
          );

        this.note =
          response.data.note;
      } else if (this.note) {
        const response =
          await firstValueFrom(
            this.noteService
              .updateNote(
                this.workspace.id,
                this.note.id,
                payload,
              ),
          );

        this.note =
          response.data.note;
      }

      if (
        this.note &&
        this.selectedImages.length > 0
      ) {
        await firstValueFrom(
          this.noteService
            .uploadAttachments(
              this.workspace.id,
              this.note.id,
              this.selectedImages
                .map(
                  (item) =>
                    item.file,
                ),
            ),
        );
      }

      if (!this.note) {
        throw new Error(
          'Note was not created.',
        );
      }

      const finalResponse =
        await firstValueFrom(
          this.noteService
            .getNote(
              this.workspace.id,
              this.note.id,
            ),
        );

      this.note =
        finalResponse.data.note;

      await this.modalController
        .dismiss(
          this.note,
          wasCreating
            ? 'created'
            : 'updated',
        );
    } catch (error) {
      this.errorMessage =
        this.resolveErrorMessage(
          error,
          'Unable to save this note.',
        );
    } finally {
      this.isSubmitting = false;
    }
  }

  requestDeleteNote(): void {
    if (
      !this.note ||
      !this.editable
    ) {
      return;
    }

    this.showDeleteConfirmation =
      true;
  }

  cancelDeleteNote(): void {
    if (this.isDeletingNote) {
      return;
    }

    this.showDeleteConfirmation =
      false;
  }

  async confirmDeleteNote():
    Promise<void> {
    if (
      !this.note ||
      !this.editable ||
      this.isDeletingNote
    ) {
      return;
    }

    this.errorMessage = '';
    this.isDeletingNote = true;

    try {
      const noteId =
        this.note.id;

      await firstValueFrom(
        this.noteService
          .deleteNote(
            this.workspace.id,
            noteId,
          ),
      );

      await this.modalController
        .dismiss(
          noteId,
          'deleted',
        );
    } catch (error) {
      this.errorMessage =
        this.resolveErrorMessage(
          error,
          'Unable to delete this note.',
        );
    } finally {
      this.isDeletingNote =
        false;
    }
  }

  private async loadAttachmentPreviews():
    Promise<void> {
    if (
      !this.note ||
      this.note.attachments.length === 0
    ) {
      return;
    }

    this.isLoadingImages = true;

    for (
      const attachment
      of this.note.attachments
      ) {
      try {
        const blob =
          await firstValueFrom(
            this.noteService
              .getAttachmentFile(
                this.workspace.id,
                this.note.id,
                attachment.id,
              ),
          );

        this.attachmentPreviewUrls[
          attachment.id
          ] =
          URL.createObjectURL(
            blob,
          );
      } catch {
        /*
         * One unavailable image should not
         * prevent the note from opening.
         */
      }
    }

    this.isLoadingImages = false;
  }

  private revokeSelectedImageUrls():
    void {
    this.selectedImages
      .forEach((item) => {
        URL.revokeObjectURL(
          item.url,
        );
      });

    this.selectedImages = [];
  }

  private revokeAttachmentUrls():
    void {
    Object.values(
      this.attachmentPreviewUrls,
    ).forEach((url) => {
      URL.revokeObjectURL(url);
    });

    this.attachmentPreviewUrls = {};
  }

  private resolveErrorMessage(
    error: unknown,
    fallback: string,
  ): string {
    if (
      !(error instanceof
        HttpErrorResponse)
    ) {
      return fallback;
    }

    if (error.status === 0) {
      return 'Unable to connect to the server.';
    }

    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (error.status === 403) {
      return 'You are not allowed to modify this note.';
    }

    if (error.status === 404) {
      return 'This note is no longer available.';
    }

    if (error.status === 422) {
      return (
        error.error?.message ??
        'Please check the note information and selected images.'
      );
    }

    if (error.status === 429) {
      return 'Too many requests. Please try again shortly.';
    }

    return fallback;
  }
}
