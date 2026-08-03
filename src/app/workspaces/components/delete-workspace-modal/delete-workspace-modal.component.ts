import { HttpErrorResponse } from '@angular/common/http';
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
import { addIcons } from 'ionicons';
import {
  closeOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';

import {
  Workspace,
} from '../../models/workspace.model';
import {
  WorkspaceService,
} from '../../services/workspace.service';

@Component({
  selector: 'app-delete-workspace-modal',
  standalone: true,
  templateUrl: './delete-workspace-modal.component.html',
  styleUrl: './delete-workspace-modal.component.scss',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class DeleteWorkspaceModalComponent {
  private readonly formBuilder =
    inject(FormBuilder);

  private readonly workspaceService =
    inject(WorkspaceService);

  private readonly modalController =
    inject(ModalController);

  @Input({
    required: true,
  })
  workspace!: Workspace;

  readonly deleteForm =
    this.formBuilder.nonNullable.group({
      confirmation_name: [
        '',
        [
          Validators.required,
        ],
      ],
    });

  isSubmitting = false;
  errorMessage = '';

  constructor() {
    addIcons({
      closeOutline,
      trashOutline,
      warningOutline,
    });
  }

  get confirmationMatches(): boolean {
    return (
      this.deleteForm.controls
        .confirmation_name.value ===
      (this.workspace?.name ?? '')
    );
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
      this.deleteForm.invalid ||
      !this.confirmationMatches ||
      this.isSubmitting
    ) {
      this.deleteForm.markAllAsTouched();

      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.workspaceService
      .deleteWorkspace(
        this.workspace.id,
        this.deleteForm.controls
          .confirmation_name.value,
      )
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: () => {
          void this.modalController.dismiss(
            this.workspace,
            'deleted',
          );
        },

        error: (error: HttpErrorResponse) => {
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
      return 'Only the workspace owner can delete this workspace.';
    }

    if (error.status === 422) {
      return 'The workspace name confirmation does not match.';
    }

    if (error.status === 429) {
      return 'Too many requests. Please try again shortly.';
    }

    return 'Something went wrong while deleting the workspace.';
  }
}
