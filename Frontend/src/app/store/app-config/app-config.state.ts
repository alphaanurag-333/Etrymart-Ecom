import { AppConfig } from '../../core/services/admin-service/app-config.service';

export const APP_CONFIG_FEATURE_KEY = 'appConfig' as const;

export interface AppConfigState {
  /** Merged public + admin document (partial). */
  data: Partial<AppConfig> | null;
  /** Last successful `GET /api/public/app-config` (no admin-only fields). */
  publicSnapshot: Partial<AppConfig> | null;
  loadingPublic: boolean;
  publicLoaded: boolean;
  adminMerged: boolean;
  error: string | null;
}

export const initialAppConfigState: AppConfigState = {
  data: null,
  publicSnapshot: null,
  loadingPublic: false,
  publicLoaded: false,
  adminMerged: false,
  error: null,
};
