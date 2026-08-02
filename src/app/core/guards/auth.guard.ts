import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import {
  catchError,
  map,
  of,
} from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (
  _route,
  state,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const loginRedirect = router.createUrlTree(
    ['/login'],
    {
      queryParams: {
        returnUrl: state.url,
      },
    },
  );

  if (!authService.isAuthenticated()) {
    return loginRedirect;
  }

  if (authService.getCurrentUser()) {
    return true;
  }

  return authService.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => {
      authService.clearSession();

      return of(loginRedirect);
    }),
  );
};
