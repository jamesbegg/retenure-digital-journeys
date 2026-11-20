import { Routes } from '@angular/router';
import { stories } from '@retenure/ui/stories';
import { Gallery } from './gallery';
import { GalleryIndex } from './gallery-index';

export default [
  {
    path: '',
    component: Gallery,
    children: [
      { path: '', component: GalleryIndex },
      ...Object.entries(stories).map(([path, loadComponent]) => ({ path, loadComponent })),
    ],
  },
] satisfies Routes;
