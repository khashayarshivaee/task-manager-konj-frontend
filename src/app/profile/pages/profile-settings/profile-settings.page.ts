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
  personCircleOutline,
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

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  templateUrl: './profile-settings.page.html',
  styleUrl: './profile-settings.page.scss',
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

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

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

  user: AuthUser | null = null;

  selectedAvatar: File | null = null;
  avatarPreviewUrl: string | null = null;

  isLoading = true;
  isSaving = false;

  errorMessage = '';
  successMessage = '';
  avatarErrorMessage = '';

  constructor() {
    addIcons({
      arrowBackOutline,
      cameraOutline,
      checkmarkCircleOutline,
      closeOutline,
      personCircleOutline,
    });
  }

  ngOnInit(): void {
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

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.setUser(user);
        },

        error: () => {
          this.errorMessage =
            'Unable to load your profile information.';
        },
      });
  }

  ngOnDestroy(): void {
    this.revokeAvatarPreview();
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

    if (!allowedTypes.includes(file.type)) {
      this.avatarErrorMessage =
        'Please select a JPG, PNG, or WebP image.';

      return;
    }

    const maximumSize =
      2 * 1024 * 1024;

    if (file.size > maximumSize) {
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
      this.profileForm.markAllAsTouched();

      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue =
      this.profileForm.getRawValue();

    this.authService
      .updateProfile({
        name: formValue.name,
        email: formValue.email,
        avatar: this.selectedAvatar,
      })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.setUser(user);
          this.clearSelectedAvatar();

          this.successMessage =
            'Your profile was updated successfully.';
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 422) {
            const validationErrors =
              error.error?.errors;

            if (
              validationErrors?.email?.[0]
            ) {
              this.errorMessage =
                validationErrors.email[0];

              return;
            }

            if (
              validationErrors?.avatar?.[0]
            ) {
              this.errorMessage =
                validationErrors.avatar[0];

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

  get nameControl() {
    return this.profileForm.controls.name;
  }

  get emailControl() {
    return this.profileForm.controls.email;
  }

  goBack(): void {
    void this.router.navigateByUrl('/home');
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
    if (!this.avatarPreviewUrl) {
      return;
    }

    URL.revokeObjectURL(
      this.avatarPreviewUrl,
    );

    this.avatarPreviewUrl = null;
  }
}
