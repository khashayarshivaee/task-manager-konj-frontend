import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Component,
  inject,
  Input,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  alertCircleOutline,
  closeOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  Project,
} from '../../models/project.model';
import {
  ProjectService,
} from '../../services/project.service';

@Component({
  selector: 'app-delete-project-modal',
  standalone: true,
  templateUrl:
    './delete-project-modal.component.html',
  styleUrl:
    './delete-project-modal.component.scss',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonSpinner,
  ],
})
export class DeleteProjectModalComponent {
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

  readonly confirmationForm =
    this.formBuilder.nonNullable.group({
      confirmation: [
        '',
        [
          Validators.required,
        ],
      ],
    });

  isDeleting = false;
  errorMessage = '';

  constructor() {
    addIcons({
      alertCircleOutline,
      closeOutline,
      trashOutline,
    });
  }

  get canDelete(): boolean {
    return (
      this.confirmationForm.controls
        .confirmation.value.trim() ===
      this.project.name
    );
  }

  close(): void {
    if (this.isDeleting) {
      return;
    }

    void this.modalController.dismiss(
      null,
      'cancel',
    );
  }

  submit(): void {
    if (
      !this.canDelete ||
      this.isDeleting
    ) {
      this.confirmationForm.markAllAsTouched();

      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    this.projectService
      .deleteProject(
        this.workspaceId,
        this.project.id,
      )
      .pipe(
        finalize(() => {
          this.isDeleting = false;
        }),
      )
      .subscribe({
        next: () => {
          void this.modalController.dismiss(
            this.project.id,
            'deleted',
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
      return 'You do not have permission to delete this project.';
    }

    if (error.status === 404) {
      return 'This project could not be found.';
    }

    if (error.status === 429) {
      return 'Too many requests. Please try again shortly.';
    }

    return 'Something went wrong while deleting the project.';
  }
}
