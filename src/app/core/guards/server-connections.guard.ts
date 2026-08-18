import {
  inject,
} from '@angular/core';

import {
  CanActivateFn,
  Router,
} from '@angular/router';

import {
  catchError,
  map,
  of,
} from 'rxjs';

import {
  AuthService,
} from '../services/auth.service';

const SERVER_CONNECTIONS_EMAIL =
  'khashayarshivaee@gmail.com';

export const serverConnectionsGuard: CanActivateFn =
  () => {
    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    const deniedRedirect =
      router.createUrlTree([
        '/',
      ]);

    const currentUser =
      authService.getCurrentUser();

    if (currentUser) {
      return (
        currentUser.email.toLowerCase() ===
        SERVER_CONNECTIONS_EMAIL
          ? true
          : deniedRedirect
      );
    }

    if (!authService.isAuthenticated()) {
      return router.createUrlTree([
        '/login',
      ]);
    }

    return authService
      .loadCurrentUser()
      .pipe(
        map((user) => (
          user.email.toLowerCase() ===
          SERVER_CONNECTIONS_EMAIL
            ? true
            : deniedRedirect
        )),

        catchError(() => {
          authService.clearSession();

          return of(
            router.createUrlTree([
              '/login',
            ]),
          );
        }),
      );
  };
