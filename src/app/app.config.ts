import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { devMockInterceptors } from './dev-mock/dev-mock';
import { JourneyService } from './journey/journey.service';
import { routes } from './app.routes';
import { tenantInterceptor } from './tenant/tenant.interceptor';
import { TenantService } from './tenant/tenant.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tenantInterceptor, ...devMockInterceptors])),
    provideAppInitializer(() => {
      // Creating the journey service first removes the token from the address bar before any request.
      inject(JourneyService);
      return inject(TenantService).load();
    }),
  ],
};
