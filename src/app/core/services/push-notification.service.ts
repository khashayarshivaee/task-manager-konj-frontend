import {
  HttpClient,
} from '@angular/common/http';

import {
  Injectable,
  inject,
} from '@angular/core';

import {
  Capacitor,
} from '@capacitor/core';

import {
  PushNotifications,
} from '@capacitor/push-notifications';

import {
  firstValueFrom,
  Subject,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly http =
    inject(HttpClient);

  private listenersInitialized =
    false;

  private currentToken:
    | string
    | null = null;

  private readonly tokenStorageKey =
    `konj-apns-token-${environment.apnsEnvironment}`;

  private readonly actionSubject =
    new Subject<Record<string, unknown>>();

  readonly action$ =
    this.actionSubject.asObservable();

  async initialize(): Promise<void> {
    if (
      !Capacitor.isNativePlatform() ||
      Capacitor.getPlatform() !== 'ios'
    ) {
      return;
    }

    if (!this.listenersInitialized) {
      await this.registerListeners();

      this.listenersInitialized =
        true;
    }

    let permission =
      await PushNotifications
        .checkPermissions();

    if (
      permission.receive ===
      'prompt'
    ) {
      permission =
        await PushNotifications
          .requestPermissions();
    }

    if (
      permission.receive !==
      'granted'
    ) {
      console.warn(
        '[Push] Notification permission not granted.',
      );

      return;
    }

    /*
     * Call this on every authenticated
     * initialization.
     *
     * APNs may return the current token
     * again and the backend will safely
     * update/reassign it.
     */
    await PushNotifications.register();
  }

  private async registerListeners():
    Promise<void> {
    await PushNotifications.addListener(
      'registration',
      (token) => {
        this.currentToken =
          token.value;

        localStorage.setItem(
          this.tokenStorageKey,
          token.value,
        );

        console.log(
          '[Push] APNs token:',
          token.value,
        );

        void this.registerDevice(
          token.value,
        );
      },
    );

    await PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error(
          '[Push] Registration error:',
          error,
        );
      },
    );

    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log(
          '[Push] Notification received:',
          notification,
        );
      },
    );

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log(
          '[Push] Notification action:',
          action,
        );

        const data =
          action.notification.data;

        if (
          !data ||
          typeof data !== 'object'
        ) {
          return;
        }

        this.actionSubject.next(
          data as Record<string, unknown>,
        );
      },
    );
  }

  async unregisterCurrentDevice():
    Promise<void> {
    if (
      !Capacitor.isNativePlatform() ||
      Capacitor.getPlatform() !== 'ios'
    ) {
      return;
    }

    const token =
      this.currentToken ??
      localStorage.getItem(
        this.tokenStorageKey,
      );

    if (!token) {
      return;
    }

    await firstValueFrom(
      this.http.delete(
        `${environment.apiUrl}/push-devices`,
        {
          body: {
            token,

            environment:
            environment
              .apnsEnvironment,
          },
        },
      ),
    );

    this.currentToken = null;

    localStorage.removeItem(
      this.tokenStorageKey,
    );

    console.log(
      '[Push] Device unregistered:',
      environment.apnsEnvironment,
    );
  }

  private async registerDevice(
    token: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/push-devices`,
          {
            token,

            platform: 'ios',

            environment:
            environment
              .apnsEnvironment,
          },
        ),
      );

      console.log(
        '[Push] Device registered:',
        environment.apnsEnvironment,
      );
    } catch (error) {
      console.error(
        '[Push] Backend device registration failed:',
        error,
      );
    }
  }
}
