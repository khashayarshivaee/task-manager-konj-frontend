import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  from,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { PushNotificationService } from './push-notification.service';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  AuthUser,
  CurrentUserResponse,
  LoginCredentials,
  UpdatePasswordPayload,
  EmailVerificationResponse,
  UpdatePasswordResponse,
  LoginRequestPayload,
  RegisterCredentials,
  RegisterRequestPayload,
  UpdateProfilePayload,
  UpdateProfileResponse,
  LogoutResponse,
} from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authUrl = `${environment.apiUrl}/auth`;
  private readonly profileUrl =
    `${environment.apiUrl}/profile`;

  private readonly currentUserSubject =
    new BehaviorSubject<AuthUser | null>(null);

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: TokenStorageService,
    private readonly pushNotifications:
      PushNotificationService,
  ) {}

  login(credentials: LoginCredentials): Observable<AuthUser> {
    const payload: LoginRequestPayload = {
      ...credentials,
      device_name: `konj-task-manager-${Capacitor.getPlatform()}`,
    };

    return this.http
      .post<AuthResponse>(`${this.authUrl}/login`, payload)
      .pipe(
        tap((response) => {
          this.tokenStorage.setToken(response.data.access_token);
          this.currentUserSubject.next(response.data.user);
        }),
        map((response) => response.data.user),
      );
  }

  register(
    credentials: RegisterCredentials,
  ): Observable<AuthUser> {
    const payload: RegisterRequestPayload = {
      ...credentials,

      device_name:
        `konj-task-manager-${Capacitor.getPlatform()}`,
    };

    return this.http
      .post<AuthResponse>(
        `${this.authUrl}/register`,
        payload,
      )
      .pipe(
        tap((response) => {
          this.tokenStorage.setToken(
            response.data.access_token,
          );

          this.currentUserSubject.next(
            response.data.user,
          );
        }),

        map(
          (response) =>
            response.data.user,
        ),
      );
  }

  loadCurrentUser(): Observable<AuthUser> {
    return this.http
      .get<CurrentUserResponse>(`${this.authUrl}/me`)
      .pipe(
        tap((response) => {
          this.currentUserSubject.next(response.data.user);
        }),
        map((response) => response.data.user),
      );
  }
  updateProfile(
    payload: UpdateProfilePayload,
  ): Observable<AuthUser> {
    const formData = new FormData();

    formData.append(
      'name',
      payload.name.trim(),
    );

    formData.append(
      'email',
      payload.email.trim().toLowerCase(),
    );

    if (payload.avatar) {
      formData.append(
        'avatar',
        payload.avatar,
        payload.avatar.name,
      );
    }

    return this.http
      .post<UpdateProfileResponse>(
        this.profileUrl,
        formData,
      )
      .pipe(
        tap((response) => {
          this.currentUserSubject.next(
            response.data.user,
          );
        }),

        map(
          (response) =>
            response.data.user,
        ),
      );
  }
  updatePassword(
    payload: UpdatePasswordPayload,
  ): Observable<UpdatePasswordResponse> {
    return this.http.put<UpdatePasswordResponse>(
      `${this.profileUrl}/password`,
      payload,
    );
  }

  resendVerificationEmail():
    Observable<EmailVerificationResponse> {
    return this.http.post<EmailVerificationResponse>(
      `${this.authUrl}/email/verification-notification`,
      {},
    );
  }
  verifyEmail(
    verificationUrl: string,
  ): Observable<EmailVerificationResponse> {
    return this.http.get<EmailVerificationResponse>(
      verificationUrl,
    );
  }
  logout(): Observable<LogoutResponse> {
    return from(
      this.pushNotifications
        .unregisterCurrentDevice(),
    ).pipe(
      catchError((error) => {
        console.error(
          '[Push] Device unregister failed during logout:',
          error,
        );

        /*
         * Push unregister failure must not
         * prevent the user from logging out.
         */
        return of(undefined);
      }),

      switchMap(() =>
        this.http.post<LogoutResponse>(
          `${this.authUrl}/logout`,
          {},
        )
      ),

      finalize(() => {
        this.clearSession();
      }),
    );
  }

  isAuthenticated(): boolean {
    return this.tokenStorage.hasToken();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  clearSession(): void {
    this.tokenStorage.removeToken();
    this.currentUserSubject.next(null);
  }
}
