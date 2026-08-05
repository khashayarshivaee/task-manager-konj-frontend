import {
  Component,
  DestroyRef,
  Input,
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
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';
import {
  WorkspaceMember,
} from '../../../workspaces/models/workspace-member.model';
import {
  WorkspaceMemberService,
} from '../../../workspaces/services/workspace-member.service';

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
  checkmarkOutline,
  closeOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  ProjectTask,
  TaskPriority,
  TaskStatus,
  UpdateTaskPayload,
} from '../../models/task.model';
import {
  TaskService,
} from '../../services/task.service';

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
  implements OnInit {
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

  private readonly taskService =
    inject(TaskService);

  private readonly memberService =
    inject(WorkspaceMemberService);

  private readonly destroyRef =
    inject(DestroyRef);

  isSubmitting = false;
  errorMessage = '';
  members: WorkspaceMember[] = [];

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
    });
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
  }
  // get selectedAssignee(): WorkspaceMember | null {
  //   const userId = this.parseAssigneeId(
  //     this.form.controls.assigned_to.value,
  //   );
  //
  //   if (userId === null) {
  //     return null;
  //   }
  //
  //   return this.members.find(
  //     (member) =>
  //       member.user_id === userId,
  //   ) ?? null;
  // }
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
    if (this.isSubmitting) {
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

  close(): void {
    if (this.isSubmitting) {
      return;
    }

    void this.modalController.dismiss(
      null,
      'cancelled',
    );
  }

  submit(): void {
    if (this.isSubmitting) {
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

    const payload: UpdateTaskPayload = {
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

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          void this.modalController.dismiss(
            response.data.task,
            'updated',
          );
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

  private normalizeDateInput(
    value: string | null,
  ): string {
    if (!value) {
      return '';
    }

    return value.substring(0, 10);
  }
}
