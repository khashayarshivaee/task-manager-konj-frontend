import {
  Component,
  DestroyRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

import {
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';
import {
  WorkspaceMember,
} from '../../../workspaces/models/workspace-member.model';
import {
  WorkspaceMemberService,
} from '../../../workspaces/services/workspace-member.service';


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
  IonContent,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  addOutline,
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
  CreateTaskPayload,
  ProjectTask,
  TaskPriority,
  TaskStatus,
} from '../../models/task.model';
import {
  TaskService,
} from '../../services/task.service';

interface SelectedTaskImage {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-create-task-modal',
  standalone: true,
  templateUrl:
    './create-task-modal.component.html',
  styleUrl:
    './create-task-modal.component.scss',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
    UserAvatarComponent,
  ],
})
export class CreateTaskModalComponent
  implements OnInit, OnDestroy {
  @Input({
    required: true,
  })
  workspaceId!: number;

  @Input({
    required: true,
  })
  projectId!: number;

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly modalController =
    inject(ModalController);

  private readonly taskService =
    inject(TaskService);

  private readonly memberService =
    inject(WorkspaceMemberService);

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

  selectedImages: SelectedTaskImage[] = [];

  members: WorkspaceMember[] = [];

  isLoadingMembers = false;
  memberLoadError = '';

  createdTask: ProjectTask | null = null;

  isCreatingTask = false;
  isUploadingImages = false;

  errorMessage = '';

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
      addOutline,
      checkmarkOutline,
      closeOutline,
      cloudUploadOutline,
      imageOutline,
      trashOutline,
    });
  }

  get isBusy(): boolean {
    return (
      this.isCreatingTask ||
      this.isUploadingImages
    );
  }

  ngOnInit(): void {
    this.loadWorkspaceMembers();
  }

  get selectedAssigneeCount(): number {
    return this.form.controls
      .assignee_ids.value.length;
  }

  isAssigneeSelected(
    userId: number,
  ): boolean {
    return this.form.controls
      .assignee_ids.value.includes(userId);
  }

  toggleAssignee(
    userId: number,
  ): void {
    if (
      this.isBusy ||
      this.createdTask
    ) {
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
      this.workspaceId <= 0
    ) {
      this.memberLoadError =
        'The workspace address is invalid.';

      return;
    }

    this.isLoadingMembers = true;
    this.memberLoadError = '';

    this.memberService
      .getMembers(this.workspaceId)
      .pipe(
        finalize(() => {
          this.isLoadingMembers = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (members) => {
          this.members = members.filter(
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
              'You cannot view members of this workspace.';

            return;
          }

          this.memberLoadError =
            'Unable to load workspace members.';
        },
      });
  }

  getMemberRoleLabel(
    member: WorkspaceMember,
  ): string {
    return (
      member.role.charAt(0).toUpperCase() +
      member.role.slice(1)
    );
  }

  ngOnDestroy(): void {
    this.revokeSelectedImageUrls();
  }

  close(): void {
    if (this.isBusy) {
      return;
    }

    if (this.createdTask) {
      this.finishWithoutImages();

      return;
    }

    void this.modalController.dismiss(
      null,
      'cancelled',
    );
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
      this.createdTask
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
        'You can attach up to 5 images when creating a task.';

      return;
    }

    const hasInvalidType = files.some(
      (file) =>
        !this.acceptedImageTypes.includes(
          file.type,
        ),
    );

    if (hasInvalidType) {
      this.errorMessage =
        'Only JPG, PNG and WebP images are allowed.';

      return;
    }

    const hasOversizedFile = files.some(
      (file) =>
        file.size > this.maximumFileSize,
    );

    if (hasOversizedFile) {
      this.errorMessage =
        'Each image must be smaller than 10 MB.';

      return;
    }

    const newImages = files.map(
      (file): SelectedTaskImage => ({
        file,
        previewUrl:
          URL.createObjectURL(file),
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
      this.createdTask
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

  submit(): void {
    if (this.isBusy) {
      return;
    }

    if (this.createdTask) {
      this.uploadSelectedImages();

      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const startsAt =
      this.normalizeNullable(
        this.form.controls.starts_at.value,
      );

    const dueAt =
      this.normalizeNullable(
        this.form.controls.due_at.value,
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

    const payload: CreateTaskPayload = {
      title:
        this.form.controls.title.value.trim(),

      description:
        this.normalizeNullable(
          this.form.controls.description.value,
        ),

      status:
      this.form.controls.status.value,

      priority:
      this.form.controls.priority.value,

      assignee_ids: [
        ...this.form.controls
          .assignee_ids.value,
      ],
      starts_at: startsAt,
      due_at: dueAt,
    };

    this.isCreatingTask = true;
    this.errorMessage = '';

    this.taskService
      .createTask(
        this.workspaceId,
        this.projectId,
        payload,
      )
      .pipe(
        finalize(() => {
          this.isCreatingTask = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.createdTask =
            response.data.task;

          if (
            this.selectedImages.length === 0
          ) {
            this.finishTaskCreation();

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
              'You do not have permission to create tasks in this project.';

            return;
          }

          this.errorMessage =
            'Unable to create the task. Please try again.';
        },
      });
  }

  finishWithoutImages(): void {
    if (
      !this.createdTask ||
      this.isBusy
    ) {
      return;
    }

    this.finishTaskCreation();
  }

  private uploadSelectedImages(): void {
    if (
      !this.createdTask ||
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
        this.createdTask.id,
        this.selectedImages.map(
          (selectedImage) =>
            selectedImage.file,
        ),
      )
      .pipe(
        finalize(() => {
          this.isUploadingImages = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!this.createdTask) {
            return;
          }

          this.createdTask = {
            ...this.createdTask,
            attachments:
            response.data.attachments,
          };

          this.finishTaskCreation();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 422) {
            this.errorMessage =
              error.error?.message ||
              'The task was created, but the selected images could not be uploaded.';

            return;
          }

          if (error.status === 403) {
            this.errorMessage =
              'The task was created, but you do not have permission to upload these images.';

            return;
          }

          this.errorMessage =
            'The task was created, but image upload failed. Retry the upload or finish without images.';
        },
      });
  }

  private finishTaskCreation(): void {
    if (!this.createdTask) {
      return;
    }

    void this.modalController.dismiss(
      this.createdTask,
      'created',
    );
  }

  private normalizeNullable(
    value: string,
  ): string | null {
    const normalized = value.trim();

    return normalized !== ''
      ? normalized
      : null;
  }

  // private parseAssigneeId(
  //   value: string,
  // ): number | null {
  //   if (value.trim() === '') {
  //     return null;
  //   }
  //
  //   const userId = Number(value);
  //
  //   return (
  //     Number.isInteger(userId) &&
  //     userId > 0
  //   )
  //     ? userId
  //     : null;
  // }

  private revokeSelectedImageUrls(): void {
    for (
      const selectedImage of
      this.selectedImages
      ) {
      URL.revokeObjectURL(
        selectedImage.previewUrl,
      );
    }
  }
}
