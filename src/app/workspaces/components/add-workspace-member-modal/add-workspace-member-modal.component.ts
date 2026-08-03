import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Component,
  DestroyRef,
  Input,
  inject,
} from '@angular/core';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
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
  mailOutline,
  personAddOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  ManageableWorkspaceRole,
  WorkspaceMember,
} from '../../models/workspace-member.model';
import {
  WorkspaceMemberService,
} from '../../services/workspace-member.service';

@Component({
  selector: 'app-add-workspace-member-modal',
  standalone: true,
  templateUrl:
    './add-workspace-member-modal.component.html',
  styleUrl:
    './add-workspace-member-modal.component.scss',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class AddWorkspaceMemberModalComponent {
  private readonly formBuilder =
    inject(FormBuilder);

  private readonly modalController =
    inject(ModalController);

  private readonly memberService =
    inject(WorkspaceMemberService);

  private readonly destroyRef =
    inject(DestroyRef);

  @Input({ required: true })
  workspaceId!: number;

  readonly memberForm =
    this.formBuilder.nonNullable.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(255),
        ],
      ],

      role: [
        'member' as ManageableWorkspaceRole,
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
      mailOutline,
      personAddOutline,
      shieldCheckmarkOutline,
    });
  }

  get emailControl() {
    return this.memberForm.controls.email;
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
    if (
      this.memberForm.invalid ||
      this.isSubmitting ||
      !Number.isInteger(this.workspaceId) ||
      this.workspaceId <= 0
    ) {
      this.memberForm.markAllAsTouched();

      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue =
      this.memberForm.getRawValue();

    this.memberService
      .addMember(
        this.workspaceId,
        {
          email: formValue.email,
          role: formValue.role,
        },
      )
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (
          member: WorkspaceMember,
        ) => {
          void this.modalController.dismiss(
            member,
            'created',
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 403) {
            this.errorMessage =
              'You are not allowed to add workspace members.';

            return;
          }

          if (error.status === 422) {
            const emailError =
              error.error?.errors?.email?.[0];

            const roleError =
              error.error?.errors?.role?.[0];

            this.errorMessage =
              emailError ??
              roleError ??
              'Please review the member information.';

            return;
          }

          this.errorMessage =
            'Unable to add this workspace member. Please try again.';
        },
      });
  }
}
