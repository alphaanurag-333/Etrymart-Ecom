import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { AppConfig } from '../../core/services/admin-service/app-config.service';

export const AppConfigActions = createActionGroup({
  source: 'App Config',
  events: {
    'Load Public': emptyProps(),
    'Load Public Success': props<{ config: Partial<AppConfig> }>(),
    'Load Public Failure': props<{ error: string }>(),
    'Merge Admin': emptyProps(),
    'Merge Admin Success': props<{ config: Partial<AppConfig> }>(),
    'Merge Admin Failure': props<{ error: string }>(),
    'Patch From Settings': props<{ config: Partial<AppConfig> }>(),
    'Reset After Admin Logout': emptyProps(),
  },
});
