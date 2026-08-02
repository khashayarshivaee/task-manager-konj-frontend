import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, map, tap } from 'rxjs';
import { Capacitor } from '@capacitor/core';

import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  AuthUser,
  CurrentUserResponse,
  LoginCredentials,
  LoginRequestPayload,
  LogoutResponse,
} from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserSubject =
    new BehaviorSubject<AuthUser | null>(null);

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly tokenStorage: TokenStorageService,
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

  logout(): Observable<LogoutResponse> {
    return this.http
      .post<LogoutResponse>(`${this.authUrl}/logout`, {})
      .pipe(
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
