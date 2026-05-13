import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/admin-service/auth.service';

export const sellerAuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSeller()) return true;
  return router.createUrlTree(['/seller/login'], {
    queryParams: { returnUrl: state.url },
  });
};
