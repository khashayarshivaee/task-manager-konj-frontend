import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
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
  gridOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';

import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-create-workspace-modal',
  standalone: true,
  templateUrl: './create-workspace-modal.component.html',
  styleUrl: './create-workspace-modal.component.scss',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class CreateWorkspaceModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly modalController = inject(ModalController);

  readonly workspaceForm = this.formBuilder.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ],
    ],
  });

  isSubmitting = false;
  errorMessage = '';

  constructor() {
    addIcons({
      closeOutline,
      gridOutline,
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
      this.workspaceForm.invalid ||
      this.isSubmitting
    ) {
      this.workspaceForm.markAllAsTouched();

      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.workspaceService
      .createWorkspace(
        this.workspaceForm.getRawValue(),
      )
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: (workspace) => {
          void this.modalController.dismiss(
            workspace,
            'created',
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
      return 'Your account is not allowed to create a workspace.';
    }

    if (error.status === 422) {
      return 'Workspace name must be between 2 and 120 characters.';
    }

    if (error.status === 429) {
      return 'Too many requests. Please try again shortly.';
    }

    return 'Something went wrong while creating the workspace.';
  }
}
