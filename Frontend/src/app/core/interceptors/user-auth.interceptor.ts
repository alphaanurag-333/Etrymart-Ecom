import { HttpInterceptorFn } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { readStorefrontAccessToken } from '../config/storefront-session';

/** Attach storefront Bearer token to API calls under `/api/user/`. */
export const userAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const prefix = `${API_URL}/user`;
  if (!req.url.startsWith(prefix)) {
    return next(req);
  }
  const token = readStorefrontAccessToken();
  if (!token) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
