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
