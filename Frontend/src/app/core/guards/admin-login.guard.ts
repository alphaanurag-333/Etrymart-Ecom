import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/admin-service/auth.service';

/** Sends authenticated admins away from the login screen. */
export const adminLoginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAdmin()) return true;
  return router.createUrlTree(['/admin']);
};
