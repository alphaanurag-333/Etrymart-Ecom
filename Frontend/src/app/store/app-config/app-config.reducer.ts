import { createReducer, on } from '@ngrx/store';
import { AppConfigActions } from './app-config.actions';
import { APP_CONFIG_FEATURE_KEY, AppConfigState, initialAppConfigState } from './app-config.state';

export { APP_CONFIG_FEATURE_KEY };

export const appConfigReducer = createReducer(
  initialAppConfigState,
  on(AppConfigActions.loadPublic, (state): AppConfigState => ({
    ...state,
    loadingPublic: true,
    error: null,
  })),
  on(AppConfigActions.loadPublicSuccess, (state, { config }): AppConfigState => ({
    ...state,
    loadingPublic: false,
    publicLoaded: true,
    publicSnapshot: { ...config },
    data: { ...(state.data ?? {}), ...config },
    error: null,
  })),
  on(AppConfigActions.loadPublicFailure, (state, { error }): AppConfigState => ({
    ...state,
    loadingPublic: false,
    publicLoaded: true,
    error,
  })),
  on(AppConfigActions.mergeAdminSuccess, (state, { config }): AppConfigState => ({
    ...state,
    adminMerged: true,
    data: { ...(state.data ?? {}), ...config },
    error: null,
  })),
  on(AppConfigActions.mergeAdminFailure, (state, { error }): AppConfigState => ({
    ...state,
    error,
  })),
  on(AppConfigActions.patchFromSettings, (state, { config }): AppConfigState => ({
    ...state,
    data: { ...(state.data ?? {}), ...config },
  })),
  on(AppConfigActions.resetAfterAdminLogout, (state): AppConfigState => ({
    ...state,
    adminMerged: false,
    data: state.publicSnapshot ? { ...state.publicSnapshot } : state.data,
  })),
);
