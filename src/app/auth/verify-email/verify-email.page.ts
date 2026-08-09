import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

import {
  Router,
} from '@angular/router';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';

import {
  addIcons,
} from 'ionicons';

import {
  checkmarkCircleOutline,
  logOutOutline,
  mailUnreadOutline,
  refreshOutline,
} from 'ionicons/icons';

import {
  finalize,
} from 'rxjs';

import {
  AuthService,
} from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,

  templateUrl:
    './verify-email.page.html',

  styleUrls: [
    '../login/login.page.scss',
    './verify-email.page.scss',
  ],

  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class VerifyEmailPage
  implements OnInit {
  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  email = '';

  isChecking = false;
  isResending = false;
  isLoggingOut = false;

  errorMessage = '';
  successMessage = '';

  constructor() {
    addIcons({
      mailUnreadOutline,
      refreshOutline,
      checkmarkCircleOutline,
      logOutOutline,
    });
  }

  ngOnInit(): void {
    const user =
      this.authService.getCurrentUser();

    if (!user) {
      return;
    }

    if (user.email_verified_at) {
      void this.router.navigateByUrl(
        '/home',
      );

      return;
    }

    this.email = user.email;
  }

  resend(): void {
    if (this.isResending) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isResending = true;

    this.authService
      .resendVerificationEmail()
      .pipe(
        finalize(() => {
          this.isResending = false;
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage =
            'A new verification email has been sent.';
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 429) {
            this.errorMessage =
              'Too many requests. Please wait before requesting another email.';

            return;
          }

          this.errorMessage =
            'Unable to resend the verification email. Please try again.';
        },
      });
  }

  continue(): void {
    if (this.isChecking) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isChecking = true;

    this.authService
      .loadCurrentUser()
      .pipe(
        finalize(() => {
          this.isChecking = false;
        }),
      )
      .subscribe({
        next: (user) => {
          if (
            user.email_verified_at
          ) {
            void this.router.navigateByUrl(
              '/home',
            );

            return;
          }

          this.errorMessage =
            'Your email has not been verified yet. Open the verification link in your inbox and try again.';
        },

        error: () => {
          this.errorMessage =
            'Unable to check your verification status. Please try again.';
        },
      });
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.isLoggingOut = false;

          void this.router.navigateByUrl(
            '/login',
          );
        }),
      )
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }
}
