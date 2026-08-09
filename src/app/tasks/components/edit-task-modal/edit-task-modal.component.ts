import {
  Component,
  DestroyRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  AlertController,
  IonContent,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  checkmarkOutline,
  closeOutline,
  cloudUploadOutline,
  imageOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';
import {
  ProjectMember,
} from '../../../projects/models/project-member.model';

import {
  ProjectMemberService,
} from '../../../projects/services/project-member.service';
import {
  ProjectTask,
  TaskAttachment,
  TaskPriority,
  TaskStatus,
  UpdateTaskPayload,
} from '../../models/task.model';
import {
  TaskService,
} from '../../services/task.service';

interface SelectedTaskImage {
  file: File;
  previewUrl: string;
}
interface ExistingTaskImage {
  attachment: TaskAttachment;
  previewUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}

@Component({
  selector: 'app-edit-task-modal',
  standalone: true,
  templateUrl:
    './edit-task-modal.component.html',
  styleUrl:
    './edit-task-modal.component.scss',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
    UserAvatarComponent,
  ],
})
export class EditTaskModalComponent
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
  task!: ProjectTask;

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly modalController =
    inject(ModalController);

  private readonly alertController =
    inject(AlertController);

  private readonly taskService =
    inject(TaskService);

  private readonly memberService =
    inject(ProjectMemberService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly acceptedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  private readonly maximumFileSize =
    10 * 1024 * 1024;

  readonly maximumImages = 5;
  readonly maximumTaskImages = 10;

  selectedImages: SelectedTaskImage[] = [];

  existingImages: ExistingTaskImage[] = [];

  attachmentDeleteId: number | null = null;

  isLoadingExistingImages = false;
  existingImagesError = '';

  updatedTask: ProjectTask | null = null;

  isSubmitting = false;
  isUploadingImages = false;

  errorMessage = '';

  members: ProjectMember[] = [];

  isLoadingMembers = false;
  memberLoadError = '';

  readonly form =
    this.formBuilder.nonNullable.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(180),
        ],
      ],

      description: [''],

      status: [
        'todo' as TaskStatus,
        [
          Validators.required,
        ],
      ],

      priority: [
        'medium' as TaskPriority,
        [
          Validators.required,
        ],
      ],

      assignee_ids:
        this.formBuilder.nonNullable.control<
          number[]
        >([]),

      starts_at: [''],
      due_at: [''],
    });

  constructor() {
    addIcons({
      checkmarkOutline,
      closeOutline,
      cloudUploadOutline,
      imageOutline,
      trashOutline,
    });
  }

  get isBusy(): boolean {
    return (
      this.isSubmitting ||
      this.isUploadingImages ||
      this.attachmentDeleteId !== null
    );
  }

  get selectedAssigneeCount(): number {
    return this.form.controls
      .assignee_ids.value.length;
  }

  ngOnInit(): void {
    const currentAssigneeIds =
      this.task.assignees?.map(
        (assignee) => assignee.id,
      ) ?? (
        this.task.assigned_to !== null
          ? [this.task.assigned_to]
          : []
      );

    this.form.setValue({
      title: this.task.title,

      description:
        this.task.description ?? '',

      status: this.task.status,

      priority: this.task.priority,

      assignee_ids:
      currentAssigneeIds,

      starts_at:
        this.normalizeDateInput(
          this.task.starts_at,
        ),

      due_at:
        this.normalizeDateInput(
          this.task.due_at,
        ),
    });

    this.loadWorkspaceMembers();
    this.loadExistingImages();
  }

  ngOnDestroy(): void {
    this.revokeSelectedImageUrls();
    this.revokeExistingImageUrls();
  }

  isAssigneeSelected(
    userId: number,
  ): boolean {
    return this.form.controls
      .assignee_ids.value.includes(
        userId,
      );
  }

  toggleAssignee(
    userId: number,
  ): void {
    if (this.isBusy) {
      return;
    }

    const currentIds =
      this.form.controls
        .assignee_ids.value;

    const updatedIds =
      currentIds.includes(userId)
        ? currentIds.filter(
          (currentUserId) =>
            currentUserId !== userId,
        )
        : [
          ...currentIds,
          userId,
        ];

    this.form.controls.assignee_ids
      .setValue(updatedIds);

    this.form.controls.assignee_ids
      .markAsDirty();
  }

  loadWorkspaceMembers(): void {
    if (
      !Number.isInteger(this.workspaceId) ||
      !Number.isInteger(this.projectId) ||
      this.workspaceId <= 0 ||
      this.projectId <= 0
    ) {
      this.memberLoadError =
        'The project address is invalid.';

      return;
    }

    this.isLoadingMembers = true;
    this.memberLoadError = '';

    this.memberService
      .getMembers(
        this.workspaceId,
        this.projectId,
      )
      .pipe(
        finalize(() => {
          this.isLoadingMembers = false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (members) => {
          this.members =
            members.filter(
              (member) =>
                member.user.is_active,
            );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.members = [];

          if (error.status === 403) {
            this.memberLoadError =
              'You cannot view members of this project.';

            return;
          }

          this.memberLoadError =
            'Unable to load project members.';
        },
      });
  }
  loadExistingImages(): void {
    if (
      !Number.isInteger(this.workspaceId) ||
      !Number.isInteger(this.projectId) ||
      !Number.isInteger(this.task.id) ||
      this.workspaceId <= 0 ||
      this.projectId <= 0 ||
      this.task.id <= 0
    ) {
      this.existingImagesError =
        'Unable to load existing task images.';

      return;
    }

    this.isLoadingExistingImages = true;
    this.existingImagesError = '';

    this.taskService
      .getAttachments(
        this.workspaceId,
        this.projectId,
        this.task.id,
      )
      .pipe(
        finalize(() => {
          this.isLoadingExistingImages =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          this.revokeExistingImageUrls();

          this.existingImages =
            response.data.attachments.map(
              (attachment) => ({
                attachment,
                previewUrl: null,
                isLoading: true,
                hasError: false,
              }),
            );

          for (
            const image of
            this.existingImages
            ) {
            this.loadExistingImagePreview(
              image.attachment.id,
            );
          }
        },

        error: () => {
          this.revokeExistingImageUrls();

          this.existingImages = [];

          this.existingImagesError =
            'Unable to load existing task images.';
        },
      });

  }
  async requestDeleteExistingImage(
    image: ExistingTaskImage,
  ): Promise<void> {
    if (
      this.isBusy ||
      this.updatedTask
    ) {
      return;
    }

    const alert =
      await this.alertController.create({
        header: 'Delete image?',

        message:
          `Remove "${image.attachment.original_name}" from this task? This change happens immediately.`,

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

    this.deleteExistingImage(image);
  }
  private loadExistingImagePreview(
    attachmentId: number,
  ): void {
    this.taskService
      .getAttachmentFile(
        this.workspaceId,
        this.projectId,
        this.task.id,
        attachmentId,
      )
      .pipe(
        finalize(() => {
          this.existingImages =
            this.existingImages.map(
              (image) => {
                if (
                  image.attachment.id !==
                  attachmentId
                ) {
                  return image;
                }

                return {
                  ...image,
                  isLoading: false,
                  hasError:
                    image.previewUrl === null,
                };
              },
            );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (blob) => {
          const previewUrl =
            URL.createObjectURL(blob);

          let imageStillExists = false;

          this.existingImages =
            this.existingImages.map(
              (image) => {
                if (
                  image.attachment.id !==
                  attachmentId
                ) {
                  return image;
                }

                imageStillExists = true;

                if (image.previewUrl) {
                  URL.revokeObjectURL(
                    image.previewUrl,
                  );
                }

                return {
                  ...image,
                  previewUrl,
                  isLoading: false,
                  hasError: false,
                };
              },
            );

          if (!imageStillExists) {
            URL.revokeObjectURL(
              previewUrl,
            );
          }
        },

        error: () => {
          this.existingImages =
            this.existingImages.map(
              (image) =>
                image.attachment.id ===
                attachmentId
                  ? {
                    ...image,
                    previewUrl: null,
                    isLoading: false,
                    hasError: true,
                  }
                  : image,
            );
        },
      });
  }



  onFilesSelected(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const files = Array.from(
      input.files ?? [],
    );

    input.value = '';

    if (
      files.length === 0 ||
      this.isBusy ||
      this.updatedTask
    ) {
      return;
    }

    this.errorMessage = '';

    if (
      this.selectedImages.length +
      files.length >
      this.maximumImages
    ) {
      this.errorMessage =
        'You can attach up to 5 new images while editing a task.';

      return;
    }
    if (
      this.existingImages.length +
      this.selectedImages.length +
      files.length >
      this.maximumTaskImages
    ) {
      this.errorMessage =
        'A task can contain up to 10 images.';

      return;
    }

    const hasInvalidType =
      files.some(
        (file) =>
          !this.acceptedImageTypes
            .includes(file.type),
      );

    if (hasInvalidType) {
      this.errorMessage =
        'Only JPG, PNG and WebP images are allowed.';

      return;
    }

    const hasOversizedFile =
      files.some(
        (file) =>
          file.size >
          this.maximumFileSize,
      );

    if (hasOversizedFile) {
      this.errorMessage =
        'Each image must be smaller than 10 MB.';

      return;
    }

    const newImages =
      files.map(
        (file): SelectedTaskImage => ({
          file,

          previewUrl:
            URL.createObjectURL(
              file,
            ),
        }),
      );

    this.selectedImages = [
      ...this.selectedImages,
      ...newImages,
    ];
  }

  removeSelectedImage(
    index: number,
  ): void {
    if (
      this.isBusy ||
      this.updatedTask
    ) {
      return;
    }

    const selectedImage =
      this.selectedImages[index];

    if (!selectedImage) {
      return;
    }

    URL.revokeObjectURL(
      selectedImage.previewUrl,
    );

    this.selectedImages =
      this.selectedImages.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      );
  }

  close(): void {
    if (this.isBusy) {
      return;
    }

    if (this.updatedTask) {
      this.finishTaskUpdate();

      return;
    }

    void this.modalController.dismiss(
      null,
      'cancelled',
    );
  }

  submit(): void {
    if (this.isBusy) {
      return;
    }

    /*
     * The task was already updated but an
     * attachment upload failed. A second
     * submit retries only the upload.
     */
    if (this.updatedTask) {
      this.uploadSelectedImages();

      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const startsAt =
      this.normalizeNullable(
        this.form.controls
          .starts_at.value,
      );

    const dueAt =
      this.normalizeNullable(
        this.form.controls
          .due_at.value,
      );

    if (
      startsAt &&
      dueAt &&
      dueAt < startsAt
    ) {
      this.errorMessage =
        'Due date cannot be earlier than the start date.';

      return;
    }

    const payload:
      UpdateTaskPayload = {
      title:
        this.form.controls
          .title.value.trim(),

      description:
        this.normalizeNullable(
          this.form.controls
            .description.value,
        ),

      status:
      this.form.controls
        .status.value,

      priority:
      this.form.controls
        .priority.value,

      assignee_ids: [
        ...this.form.controls
          .assignee_ids.value,
      ],

      starts_at: startsAt,
      due_at: dueAt,
    };

    this.isSubmitting = true;
    this.errorMessage = '';

    this.taskService
      .updateTask(
        this.workspaceId,
        this.projectId,
        this.task.id,
        payload,
      )
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          this.updatedTask =
            response.data.task;

          if (
            this.selectedImages.length ===
            0
          ) {
            this.finishTaskUpdate();

            return;
          }

          this.uploadSelectedImages();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 422) {
            this.errorMessage =
              'Please review the task information and try again.';

            return;
          }

          if (error.status === 403) {
            this.errorMessage =
              'You do not have permission to update this task.';

            return;
          }

          if (error.status === 404) {
            this.errorMessage =
              'This task could not be found.';

            return;
          }

          this.errorMessage =
            'Unable to update the task. Please try again.';
        },
      });
  }

  private uploadSelectedImages(): void {
    if (
      !this.updatedTask ||
      this.selectedImages.length === 0 ||
      this.isUploadingImages
    ) {
      return;
    }

    this.isUploadingImages = true;
    this.errorMessage = '';

    this.taskService
      .uploadAttachments(
        this.workspaceId,
        this.projectId,
        this.updatedTask.id,
        this.selectedImages.map(
          (selectedImage) =>
            selectedImage.file,
        ),
      )
      .pipe(
        finalize(() => {
          this.isUploadingImages =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          if (!this.updatedTask) {
            return;
          }

          this.updatedTask = {
            ...this.updatedTask,

            attachments:
            response.data.attachments,
          };

          this.finishTaskUpdate();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 422) {
            this.errorMessage =
              error.error?.message ||
              'Task changes were saved, but the selected images could not be uploaded.';

            return;
          }

          if (error.status === 403) {
            this.errorMessage =
              'Task changes were saved, but you do not have permission to upload these images.';

            return;
          }

          this.errorMessage =
            'Task changes were saved, but image upload failed. Retry the upload or finish without images.';
        },
      });
  }

  private finishTaskUpdate(): void {
    if (!this.updatedTask) {
      return;
    }

    const task =
      this.updatedTask;

    this.revokeSelectedImageUrls();

    void this.modalController.dismiss(
      task,
      'updated',
    );
  }

  private revokeSelectedImageUrls(): void {
    for (
      const selectedImage of
      this.selectedImages
      ) {
      URL.revokeObjectURL(
        selectedImage.previewUrl,
      );
    }

    this.selectedImages = [];
  }
  private revokeExistingImageUrls(): void {
    for (
      const image of this.existingImages
      ) {
      if (image.previewUrl) {
        URL.revokeObjectURL(
          image.previewUrl,
        );
      }
    }
  }

  private normalizeNullable(
    value: string,
  ): string | null {
    const normalized =
      value.trim();

    return normalized !== ''
      ? normalized
      : null;
  }
  private deleteExistingImage(
    image: ExistingTaskImage,
  ): void {
    if (
      this.attachmentDeleteId !== null ||
      this.isSubmitting ||
      this.isUploadingImages
    ) {
      return;
    }

    this.attachmentDeleteId =
      image.attachment.id;

    this.existingImagesError = '';

    this.taskService
      .deleteAttachment(
        this.workspaceId,
        this.projectId,
        this.task.id,
        image.attachment.id,
      )
      .pipe(
        finalize(() => {
          this.attachmentDeleteId = null;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: () => {
          if (image.previewUrl) {
            URL.revokeObjectURL(
              image.previewUrl,
            );
          }

          this.existingImages =
            this.existingImages.filter(
              (existingImage) =>
                existingImage.attachment.id !==
                image.attachment.id,
            );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 403) {
            this.existingImagesError =
              'You do not have permission to delete this image.';

            return;
          }

          if (error.status === 404) {
            this.existingImagesError =
              'This image could not be found.';

            return;
          }

          this.existingImagesError =
            'Unable to delete the image. Please try again.';
        },
      });
  }

  private normalizeDateInput(
    value: string | null,
  ): string {
    if (!value) {
      return '';
    }

    return value.substring(
      0,
      10,
    );
  }
}
