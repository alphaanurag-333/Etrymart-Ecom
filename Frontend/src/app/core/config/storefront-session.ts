/** Shared with `UserAuthService` and `userAuthInterceptor` (interceptor must not inject the service — HttpClient cycle). */
export const STOREFRONT_SESSION_KEY = 'etrymart_user_session';

export function readStorefrontAccessToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STOREFRONT_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { token?: string };
    return typeof s.token === 'string' ? s.token : null;
  } catch {
    return null;
  }
}
