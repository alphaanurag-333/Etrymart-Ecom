import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { API_URL } from '../../core/config/api.config';
import { AppConfigResponse, AppConfigService } from '../../core/services/admin-service/app-config.service';
import { AuthService } from '../../core/services/admin-service/auth.service';
import { AppConfigActions } from './app-config.actions';
import { selectAppConfigAdminMerged, selectAppConfigPublicLoaded } from './app-config.selectors';

@Injectable()
export class AppConfigEffects {
  private readonly actions$ = inject(Actions);
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);
  private readonly adminAppConfig = inject(AppConfigService);
  private readonly auth = inject(AuthService);

  readonly loadPublic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppConfigActions.loadPublic),
      withLatestFrom(this.store.select(selectAppConfigPublicLoaded)),
      filter(([, loaded]) => !loaded),
      switchMap(() =>
        this.http.get<AppConfigResponse>(`${API_URL}/public/app-config`).pipe(
          map((res) => AppConfigActions.loadPublicSuccess({ config: res.data })),
          catchError((err: unknown) =>
            of(
              AppConfigActions.loadPublicFailure({
                error: err instanceof Error ? err.message : 'Failed to load app config',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly mergeAdmin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AppConfigActions.mergeAdmin),
      filter(() => this.auth.isAdmin()),
      withLatestFrom(this.store.select(selectAppConfigAdminMerged)),
      filter(([, merged]) => !merged),
      switchMap(() =>
        this.adminAppConfig.getAppConfig().pipe(
          map((res) => AppConfigActions.mergeAdminSuccess({ config: res.data })),
          catchError((err: unknown) =>
            of(
              AppConfigActions.mergeAdminFailure({
                error: err instanceof Error ? err.message : 'Failed to merge admin app config',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
