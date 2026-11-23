import { Routes } from '@angular/router';
import { devRoutes } from './dev-routes';

export const routes: Routes = [
  ...devRoutes,
  { path: '', loadChildren: () => import('./journeys/check-in/check-in.routes') },
];
