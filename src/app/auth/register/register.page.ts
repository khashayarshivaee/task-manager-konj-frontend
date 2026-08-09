import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Component,
  inject,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  Router,
} from '@angular/router';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';

import {
  addIcons,
} from 'ionicons';

import {
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  mailOutline,
  personOutline,
} from 'ionicons/icons';

import {
  finalize,
} from 'rxjs';

import {
  AuthService,
} from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,

  templateUrl:
    './register.page.html',

  /*
   * Register intentionally reuses the
   * exact Login visual system.
   */
  styleUrl:
    '../login/login.page.scss',

  imports: [
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonSpinner,
    IonIcon,
  ],
})
export class RegisterPage {
  private readonly formBuilder =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  readonly registerForm =
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

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(255),
        ],
      ],

      password_confirmation: [
        '',
        [
          Validators.required,
          Validators.maxLength(255),
        ],
      ],
    });

  isSubmitting = false;

  isPasswordVisible = false;

  isPasswordConfirmationVisible =
    false;

  errorMessage = '';

  constructor() {
    addIcons({
      personOutline,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
    });
  }

  get passwordsDoNotMatch(): boolean {
    const password =
      this.registerForm
        .controls
        .password
        .value;

    const confirmation =
      this.registerForm
        .controls
        .password_confirmation
        .value;

    return (
      confirmation.length > 0 &&
      password !== confirmation
    );
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible =
      !this.isPasswordVisible;
  }

  togglePasswordConfirmationVisibility():
    void {
    this.isPasswordConfirmationVisible =
      !this.isPasswordConfirmationVisible;
  }

  openLogin(): void {
    void this.router.navigateByUrl(
      '/login',
    );
  }

  submit(): void {
    if (
      this.registerForm.invalid ||
      this.passwordsDoNotMatch ||
      this.isSubmitting
    ) {
      this.registerForm.markAllAsTouched();

      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService
      .register(
        this.registerForm.getRawValue(),
      )
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            '/verify-email',
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.errorMessage =
            this.resolveErrorMessage(
              error,
            );
        },
      });
  }

  private resolveErrorMessage(
    error: HttpErrorResponse,
  ): string {
    if (error.status === 0) {
      return 'Unable to connect to the server. Check your internet connection.';
    }

    if (error.status === 422) {
      const errors =
        error.error?.errors as
          | Record<string, string[]>
          | undefined;

      const emailError =
        errors?.['email']?.[0];

      if (emailError) {
        return emailError;
      }

      const passwordError =
        errors?.['password']?.[0];

      if (passwordError) {
        return passwordError;
      }

      const nameError =
        errors?.['name']?.[0];

      if (nameError) {
        return nameError;
      }

      return 'Please check the information you entered.';
    }

    if (error.status === 429) {
      return 'Too many registration attempts. Please try again shortly.';
    }

    return 'Something went wrong. Please try again.';
  }
}
