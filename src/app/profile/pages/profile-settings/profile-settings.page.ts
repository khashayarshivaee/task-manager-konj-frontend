import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  Router,
} from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  arrowBackOutline,
  cameraOutline,
  checkmarkCircleOutline,
  closeOutline,
  gridOutline,
  lockClosedOutline,
  notificationsOutline,
  personCircleOutline,
  settingsOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  AuthUser,
} from '../../../core/models/auth.model';
import {
  AuthService,
} from '../../../core/services/auth.service';
import {
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';
import {
  Workspace,
} from '../../../workspaces/models/workspace.model';
import {
  WorkspaceService,
} from '../../../workspaces/services/workspace.service';

type SettingsSection =
  | 'profile'
  | 'security'
  | 'preferences'
  | 'notifications';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  templateUrl:
    './profile-settings.page.html',
  styleUrl:
    './profile-settings.page.scss',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
    UserAvatarComponent,
  ],
})
export class ProfileSettingsPage
  implements OnInit, OnDestroy {
  private readonly formBuilder =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly workspaceService =
    inject(WorkspaceService);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  activeSection:
    SettingsSection = 'profile';

  readonly profileForm =
    this.formBuilder.nonNullable.group({
      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(100),
        ],
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(255),
        ],
      ],
    });

  readonly passwordForm =
    this.formBuilder.nonNullable.group({
      currentPassword: [
        '',
        [
          Validators.required,
        ],
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(255),
        ],
      ],

      passwordConfirmation: [
        '',
        [
          Validators.required,
        ],
      ],
    });

  user: AuthUser | null = null;

  selectedAvatar: File | null = null;
  avatarPreviewUrl: string | null = null;

  workspaces: Workspace[] = [];
  activeWorkspace: Workspace | null = null;

  isLoading = true;
  isSaving = false;
  isSavingPassword = false;
  isLoadingWorkspaces = false;

  errorMessage = '';
  successMessage = '';
  avatarErrorMessage = '';

  passwordErrorMessage = '';
  workspaceErrorMessage = '';
  workspaceSuccessMessage = '';

  constructor() {
    addIcons({
      arrowBackOutline,
      cameraOutline,
      checkmarkCircleOutline,
      closeOutline,
      gridOutline,
      lockClosedOutline,
      notificationsOutline,
      personCircleOutline,
      settingsOutline,
    });
  }

  ngOnInit(): void {
    this.loadWorkspacePreferences();

    const currentUser =
      this.authService.getCurrentUser();

    if (currentUser) {
      this.setUser(currentUser);
      this.isLoading = false;

      return;
    }

    this.authService
      .loadCurrentUser()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (user) => {
          this.setUser(user);
        },

        error: () => {
          this.errorMessage =
            'Unable to load your account information.';
        },
      });
  }

  ngOnDestroy(): void {
    this.revokeAvatarPreview();
  }

  selectSection(
    section: SettingsSection,
  ): void {
    this.activeSection = section;

    this.successMessage = '';
    this.errorMessage = '';

    this.passwordErrorMessage = '';
    this.workspaceSuccessMessage = '';
  }

  handleAvatarSelection(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.item(0) ?? null;

    input.value = '';

    this.avatarErrorMessage = '';
    this.successMessage = '';

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      this.avatarErrorMessage =
        'Please select a JPG, PNG, or WebP image.';

      return;
    }

    const maximumSize =
      2 * 1024 * 1024;

    if (
      file.size >
      maximumSize
    ) {
      this.avatarErrorMessage =
        'The profile image must be smaller than 2 MB.';

      return;
    }

    this.revokeAvatarPreview();

    this.selectedAvatar = file;

    this.avatarPreviewUrl =
      URL.createObjectURL(file);
  }

  clearSelectedAvatar(): void {
    this.selectedAvatar = null;
    this.avatarErrorMessage = '';

    this.revokeAvatarPreview();
  }

  saveProfile(): void {
    if (
      this.profileForm.invalid ||
      this.isSaving
    ) {
      this.profileForm
        .markAllAsTouched();

      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue =
      this.profileForm
        .getRawValue();

    this.authService
      .updateProfile({
        name:
        formValue.name,

        email:
        formValue.email,

        avatar:
        this.selectedAvatar,
      })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (user) => {
          this.setUser(user);

          this.clearSelectedAvatar();

          this.successMessage =
            'Your profile was updated successfully.';
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          if (
            error.status === 422
          ) {
            const validationErrors =
              error.error?.errors;

            if (
              validationErrors
                ?.email?.[0]
            ) {
              this.errorMessage =
                validationErrors
                  .email[0];

              return;
            }

            if (
              validationErrors
                ?.avatar?.[0]
            ) {
              this.errorMessage =
                validationErrors
                  .avatar[0];

              return;
            }

            this.errorMessage =
              'Please review your profile information.';

            return;
          }

          this.errorMessage =
            'Unable to update your profile. Please try again.';
        },
      });
  }

  savePassword(): void {
    this.passwordErrorMessage = '';

    if (
      this.passwordForm.invalid ||
      this.isSavingPassword
    ) {
      this.passwordForm
        .markAllAsTouched();

      return;
    }

    const formValue =
      this.passwordForm
        .getRawValue();

    if (
      formValue.password !==
      formValue.passwordConfirmation
    ) {
      this.passwordErrorMessage =
        'The new password confirmation does not match.';

      return;
    }

    if (
      formValue.currentPassword ===
      formValue.password
    ) {
      this.passwordErrorMessage =
        'Your new password must be different from your current password.';

      return;
    }

    this.isSavingPassword = true;

    this.authService
      .updatePassword({
        current_password:
        formValue.currentPassword,

        password:
        formValue.password,

        password_confirmation:
        formValue.passwordConfirmation,
      })
      .pipe(
        finalize(() => {
          this.isSavingPassword =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: () => {
          /*
           * The backend revokes every
           * personal access token after
           * a successful password change.
           */
          this.authService
            .clearSession();

          this.workspaceService
            .resetWorkspaceState();

          void this.router.navigateByUrl(
            '/login',
            {
              replaceUrl: true,
            },
          );
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          if (
            error.status === 422
          ) {
            const validationErrors =
              error.error?.errors;

            if (
              validationErrors
                ?.current_password?.[0]
            ) {
              this.passwordErrorMessage =
                'Your current password is incorrect.';

              return;
            }

            if (
              validationErrors
                ?.password?.[0]
            ) {
              this.passwordErrorMessage =
                validationErrors
                  .password[0];

              return;
            }

            this.passwordErrorMessage =
              'Please review your password information.';

            return;
          }

          this.passwordErrorMessage =
            'Unable to update your password. Please try again.';
        },
      });
  }

  selectActiveWorkspace(
    workspace: Workspace,
  ): void {
    if (
      this.activeWorkspace?.id ===
      workspace.id
    ) {
      return;
    }

    this.workspaceService
      .setActiveWorkspace(
        workspace,
      );

    this.activeWorkspace =
      workspace;

    this.workspaceSuccessMessage =
      `${workspace.name} is now your active workspace.`;
  }

  openWorkspaceManagement(): void {
    void this.router.navigateByUrl(
      '/workspaces',
    );
  }

  getWorkspaceRole(
    workspace: Workspace,
  ): string {
    if (
      this.user &&
      workspace.owner_id ===
      this.user.id
    ) {
      return 'Owner';
    }

    const role =
      workspace.membership?.role ??
      workspace.memberships
        ?.find(
          (membership) =>
            membership.user_id ===
            this.user?.id,
        )
        ?.role;

    if (!role) {
      return 'Member';
    }

    return (
      role.charAt(0).toUpperCase() +
      role.slice(1)
    );
  }

  get nameControl() {
    return this.profileForm
      .controls.name;
  }

  get emailControl() {
    return this.profileForm
      .controls.email;
  }

  get currentPasswordControl() {
    return this.passwordForm
      .controls.currentPassword;
  }

  get passwordControl() {
    return this.passwordForm
      .controls.password;
  }

  get passwordConfirmationControl() {
    return this.passwordForm
      .controls.passwordConfirmation;
  }

  goBack(): void {
    void this.router.navigateByUrl(
      '/home',
    );
  }

  private loadWorkspacePreferences(): void {
    this.isLoadingWorkspaces = true;
    this.workspaceErrorMessage = '';

    this.workspaceService
      .loadWorkspaces()
      .pipe(
        finalize(() => {
          this.isLoadingWorkspaces =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (workspaces) => {
          this.workspaces =
            workspaces;

          this.activeWorkspace =
            this.workspaceService
              .getActiveWorkspace();
        },

        error: () => {
          this.workspaces = [];
          this.activeWorkspace = null;

          this.workspaceErrorMessage =
            'Unable to load your workspace preferences.';
        },
      });
  }

  private setUser(
    user: AuthUser,
  ): void {
    this.user = user;

    this.profileForm.setValue({
      name: user.name,
      email: user.email,
    });
  }

  private revokeAvatarPreview(): void {
    if (
      !this.avatarPreviewUrl
    ) {
      return;
    }

    URL.revokeObjectURL(
      this.avatarPreviewUrl,
    );

    this.avatarPreviewUrl = null;
  }
}
