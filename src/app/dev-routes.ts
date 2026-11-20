import { Routes } from '@angular/router';

export const devRoutes: Routes = [
  { path: 'gallery', loadChildren: () => import('./gallery/gallery.routes') },
];
