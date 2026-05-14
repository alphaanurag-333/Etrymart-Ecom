import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserAuthService } from '../services/user-service/auth.service';

/** Requires an active storefront session (guest or verified). */
export const userSessionGuard: CanActivateFn = (_route, state) => {
  const auth = inject(UserAuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};
