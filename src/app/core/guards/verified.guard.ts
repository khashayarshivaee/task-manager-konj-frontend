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

export const verifiedGuard: CanActivateFn =
  () => {
    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    const currentUser =
      authService.getCurrentUser();

    if (currentUser) {
      if (
        currentUser.email_verified_at
      ) {
        return true;
      }

      return router.createUrlTree([
        '/verify-email',
      ]);
    }

    if (!authService.isAuthenticated()) {
      return router.createUrlTree([
        '/login',
      ]);
    }

    return authService
      .loadCurrentUser()
      .pipe(
        map((user) => {
          if (
            user.email_verified_at
          ) {
            return true;
          }

          return router.createUrlTree([
            '/verify-email',
          ]);
        }),

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
