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

  private readonly destroyRef =
    inject(DestroyRef);

  isSubmitting = false;
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
    this.form.setValue({
      title: this.task.title,

      description:
        this.task.description ?? '',

      status: this.task.status,
      priority: this.task.priority,

      starts_at:
        this.normalizeDateInput(
          this.task.starts_at,
        ),

      due_at:
        this.normalizeDateInput(
          this.task.due_at,
        ),
    });
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

      assigned_to:
      this.task.assigned_to,

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

  private normalizeDateInput(
    value: string | null,
  ): string {
    if (!value) {
      return '';
    }

    return value.substring(0, 10);
  }
}
