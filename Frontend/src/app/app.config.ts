import {
  ApplicationConfig,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  inject,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { userAuthInterceptor } from './core/interceptors/user-auth.interceptor';
import { routes } from './routes/app.routes';
import { AppConfigActions } from './store/app-config/app-config.actions';
import { AppConfigEffects } from './store/app-config/app-config.effects';
import { APP_CONFIG_FEATURE_KEY, appConfigReducer } from './store/app-config/app-config.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([userAuthInterceptor])),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideStore({ [APP_CONFIG_FEATURE_KEY]: appConfigReducer }),
    provideEffects([AppConfigEffects]),
    provideAppInitializer(() => {
      inject(Store).dispatch(AppConfigActions.loadPublic());
    }),
    ...(isDevMode()
      ? [
          provideStoreDevtools({
            maxAge: 40,
            trace: false,
          }),
        ]
      : []),
  ],
};
