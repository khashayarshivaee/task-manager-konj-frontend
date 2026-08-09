import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

import {
  ActivatedRoute,
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
  alertCircleOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

import {
  firstValueFrom,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';

import {
  AuthService,
} from '../../core/services/auth.service';

type VerificationState =
  | 'loading'
  | 'success'
  | 'error';

@Component({
  selector: 'app-email-verification',
  standalone: true,

  templateUrl:
    './email-verification.page.html',

  styleUrl:
    './email-verification.page.scss',

  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class EmailVerificationPage
  implements OnInit {
  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly authService =
    inject(AuthService);

  state: VerificationState =
    'loading';

  title =
    'Verifying your email';

  message =
    'Please wait while we verify your email address.';

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      alertCircleOutline,
    });
  }

  ngOnInit(): void {
    void this.verify();
  }

  continueToApp(): void {
    void this.router.navigateByUrl(
      '/home',
    );
  }

  private async verify():
    Promise<void> {
    const verificationUrl =
      this.route.snapshot
        .queryParamMap
        .get('verification_url');

    if (
      !verificationUrl ||
      !this.isValidVerificationUrl(
        verificationUrl,
      )
    ) {
      this.showError(
        'This verification link is invalid.',
      );

      return;
    }

    try {
      await firstValueFrom(
        this.authService.verifyEmail(
          verificationUrl,
        ),
      );

      this.state = 'success';

      this.title =
        'Email verified';

      this.message =
        'Your email address has been verified successfully. Your Konj account is ready.';
    } catch (
      error: unknown
      ) {
      if (
        error instanceof
        HttpErrorResponse &&
        error.status === 403
      ) {
        this.showError(
          'This verification link is invalid or has expired.',
        );

        return;
      }

      this.showError(
        'We could not verify your email address. Please request a new verification email.',
      );
    }
  }

  private isValidVerificationUrl(
    verificationUrl: string,
  ): boolean {
    try {
      const url =
        new URL(verificationUrl);

      const apiUrl =
        new URL(
          environment.apiUrl,
        );

      return (
        url.origin === apiUrl.origin &&
        url.pathname.startsWith(
          `${apiUrl.pathname}/auth/email/verify/`,
        )
      );
    } catch {
      return false;
    }
  }

  private showError(
    message: string,
  ): void {
    this.state = 'error';

    this.title =
      'Verification failed';

    this.message = message;
  }
}
