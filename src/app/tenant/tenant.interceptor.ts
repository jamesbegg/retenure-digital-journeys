import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { JourneyService } from '../journey/journey.service';
import { TenantService } from './tenant.service';

// Only same-origin /client/* is ours. The tenant lookup is how the client learns its tenant id.
export const tenantInterceptor: HttpInterceptorFn = (request, next) => {
  const path = request.url.split('?')[0];
  if (!path.startsWith('/client/')) return next(request);
  if (path === '/client/tenant') return next(request.clone({ withCredentials: true }));

  const headers: Record<string, string> = {};
  const tenantId = inject(TenantService).tenantId();
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  const journeyId = inject(JourneyService).journeyId();
  if (journeyId && path.startsWith('/client/journey')) headers['X-Journey-Id'] = journeyId;
  return next(request.clone({ setHeaders: headers, withCredentials: true }));
};
