import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MEDIA_URL } from '../../core/config/api.config';
import { APP_CONFIG_FEATURE_KEY, AppConfigState } from './app-config.state';

const selectAppConfigState = createFeatureSelector<AppConfigState>(APP_CONFIG_FEATURE_KEY);

export const selectAppConfigData = createSelector(selectAppConfigState, (s) => s.data);

function resolveMediaUrl(path: string): string {
  const p = path.trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
  return `${MEDIA_URL}${p.startsWith('/') ? '' : '/'}${p}`;
}

export const selectBrandTitle = createSelector(
  selectAppConfigData,
  (d) => d?.app_name?.trim() || 'EtryMart',
);

export const selectAdminLogoUrl = createSelector(selectAppConfigData, (d) => {
  const raw = d?.admin_logo?.trim();
  return raw ? resolveMediaUrl(raw) : null;
});

export const selectFooterLine = createSelector(selectAppConfigData, (d) => {
  const t = d?.app_footer_text?.trim();
  if (t) return t;
  return `© ${new Date().getFullYear()} EtryMart. All rights reserved.`;
});

export const selectAppConfigPublicLoaded = createSelector(
  selectAppConfigState,
  (s) => s.publicLoaded,
);

export const selectAppConfigAdminMerged = createSelector(
  selectAppConfigState,
  (s) => s.adminMerged,
);

function externalHref(url: string | null | undefined): string | null {
  const t = String(url ?? '').trim();
  if (!t) return null;
  if (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('mailto:') ||
    t.startsWith('tel:')
  ) {
    return t;
  }
  return `https://${t.replace(/^\/+/, '')}`;
}

/** Public storefront logo (`user_logo`). */
export const selectStorefrontLogoUrl = createSelector(selectAppConfigData, (d) => {
  const raw = d?.user_logo?.trim();
  return raw ? resolveMediaUrl(raw) : null;
});

export const selectStorefrontTagline = createSelector(
  selectAppConfigData,
  (d) => d?.app_detail?.trim() || 'Your trusted marketplace for quality products.',
);

export const selectStorefrontPhone = createSelector(selectAppConfigData, (d) =>
  d?.app_mobile?.trim() ? d.app_mobile.trim() : null,
);

export const selectStorefrontEmail = createSelector(selectAppConfigData, (d) =>
  d?.app_email?.trim() ? d.app_email.trim() : null,
);

export const selectStorefrontAddress = createSelector(selectAppConfigData, (d) =>
  d?.address?.trim() ? d.address.trim() : null,
);

export const selectSocialFacebook = createSelector(selectAppConfigData, (d) => externalHref(d?.facebook));

export const selectSocialTwitter = createSelector(selectAppConfigData, (d) => externalHref(d?.twitter));

export const selectSocialInstagram = createSelector(selectAppConfigData, (d) => externalHref(d?.instagram));

export const selectSocialLinkedin = createSelector(selectAppConfigData, (d) => externalHref(d?.linkedin));
