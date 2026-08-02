import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Component,
  inject,
  Input,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  ModalController,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  closeOutline,
  folderOpenOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  CreateProjectPayload,
  ProjectStatus,
} from '../../models/project.model';
import {
  ProjectService,
} from '../../services/project.service';

function projectDateRangeValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const startsAt =
    control.get('starts_at')?.value as string;

  const dueAt =
    control.get('due_at')?.value as string;

  if (
    startsAt &&
    dueAt &&
    dueAt < startsAt
  ) {
    return {
      invalidDateRange: true,
    };
  }

  return null;
}

@Component({
  selector: 'app-create-project-modal',
  standalone: true,
  templateUrl: './create-project-modal.component.html',
  styleUrl: './create-project-modal.component.scss',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTextarea,
  ],
})
export class CreateProjectModalComponent {
  @Input({
    required: true,
  })
  workspaceId!: number;

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly projectService =
    inject(ProjectService);

  private readonly modalController =
    inject(ModalController);

  readonly statuses: Array<{
    value: ProjectStatus;
    label: string;
  }> = [
    {
      value: 'planning',
      label: 'Planning',
    },
    {
      value: 'active',
      label: 'Active',
    },
    {
      value: 'on_hold',
      label: 'On hold',
    },
    {
      value: 'completed',
      label: 'Completed',
    },
  ];

  readonly projectForm =
    this.formBuilder.nonNullable.group(
      {
        name: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(120),
          ],
        ],

        description: [
          '',
          [
            Validators.maxLength(5000),
          ],
        ],

        status: [
          'planning' as ProjectStatus,
          [
            Validators.required,
          ],
        ],

        color: [
          '#ff6b00',
          [
            Validators.required,
            Validators.pattern(
              /^#[0-9a-fA-F]{6}$/,
            ),
          ],
        ],

        starts_at: [
          '',
        ],

        due_at: [
          '',
        ],
      },
      {
        validators: [
          projectDateRangeValidator,
        ],
      },
    );

  isSubmitting = false;
  errorMessage = '';

  constructor() {
    addIcons({
      closeOutline,
      folderOpenOutline,
    });
  }

  close(): void {
    if (this.isSubmitting) {
      return;
    }

    void this.modalController.dismiss(
      null,
      'cancel',
    );
  }

  submit(): void {
    if (
      this.projectForm.invalid ||
      this.isSubmitting
    ) {
      this.projectForm.markAllAsTouched();

      return;
    }

    if (!this.workspaceId) {
      this.errorMessage =
        'No active workspace was selected.';

      return;
    }

    const values =
      this.projectForm.getRawValue();

    const payload: CreateProjectPayload = {
      name: values.name.trim(),

      description:
        values.description.trim() || null,

      status: values.status,

      color:
        values.color.toLowerCase(),

      starts_at:
        values.starts_at || null,

      due_at:
        values.due_at || null,
    };

    this.isSubmitting = true;
    this.errorMessage = '';

    this.projectService
      .createProject(
        this.workspaceId,
        payload,
      )
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: (response) => {
          void this.modalController.dismiss(
            response.data.project,
            'created',
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.errorMessage =
            this.resolveErrorMessage(error);
        },
      });
  }

  private resolveErrorMessage(
    error: HttpErrorResponse,
  ): string {
    if (error.status === 0) {
      return 'Unable to connect to the server.';
    }

    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (error.status === 403) {
      return 'You do not have permission to create projects in this workspace.';
    }

    if (error.status === 422) {
      return 'Please check the project information and dates.';
    }

    if (error.status === 429) {
      return 'Too many requests. Please try again shortly.';
    }

    return 'Something went wrong while creating the project.';
  }
}
