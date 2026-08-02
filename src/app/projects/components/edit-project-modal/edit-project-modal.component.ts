import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Component,
  inject,
  Input,
  OnInit,
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
  createOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  Project,
  ProjectStatus,
  UpdateProjectPayload,
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
  selector: 'app-edit-project-modal',
  standalone: true,
  templateUrl: './edit-project-modal.component.html',

  // از استایل Modal ساخت پروژه استفاده می‌کنیم.
  styleUrl:
    '../create-project-modal/create-project-modal.component.scss',

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
export class EditProjectModalComponent
  implements OnInit {
  @Input({
    required: true,
  })
  workspaceId!: number;

  @Input({
    required: true,
  })
  project!: Project;

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
    {
      value: 'archived',
      label: 'Archived',
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
      createOutline,
    });
  }

  ngOnInit(): void {
    this.projectForm.setValue({
      name: this.project.name,

      description:
        this.project.description ?? '',

      status: this.project.status,

      color:
        this.project.color ?? '#ff6b00',

      starts_at:
        this.normalizeDate(
          this.project.starts_at,
        ),

      due_at:
        this.normalizeDate(
          this.project.due_at,
        ),
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

    const values =
      this.projectForm.getRawValue();

    const payload: UpdateProjectPayload = {
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
      .updateProject(
        this.workspaceId,
        this.project.id,
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
            'updated',
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

  private normalizeDate(
    value: string | null,
  ): string {
    return value?.substring(0, 10) ?? '';
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
      return 'You do not have permission to edit this project.';
    }

    if (error.status === 404) {
      return 'This project could not be found.';
    }

    if (error.status === 422) {
      return 'Please check the project information and dates.';
    }

    return 'Something went wrong while updating the project.';
  }
}
