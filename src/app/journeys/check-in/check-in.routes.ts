import { Routes } from '@angular/router';
import { inStage } from './check-in-navigation';
import { CheckInRoot } from '../../journey/check-in-root';
import { StatusPage } from './pages/status/status-page';
import { VerifyPage } from './pages/verify/verify-page';
import { WelcomePage } from './pages/welcome/welcome-page';

export default [
  {
    path: '',
    component: CheckInRoot,
    children: [
      {
        path: 'start',
        component: VerifyPage,
        canActivate: [inStage('verify', 'loading')],
      },
      {
        path: 'link-problem',
        component: StatusPage,
        data: { stage: 'link-problem' },
        canActivate: [inStage('link-problem')],
      },
      {
        path: 'locked',
        component: StatusPage,
        data: { stage: 'locked' },
        canActivate: [inStage('locked')],
      },
      {
        path: 'link-reissued',
        component: StatusPage,
        data: { stage: 'link-reissued' },
        canActivate: [inStage('link-reissued')],
      },
      {
        path: 'link-requested',
        component: StatusPage,
        data: { stage: 'link-requested' },
        canActivate: [inStage('link-requested')],
      },
      {
        path: 'already-completed',
        component: StatusPage,
        data: { stage: 'already-completed' },
        canActivate: [inStage('already-completed')],
      },
      {
        path: 'expired',
        component: StatusPage,
        data: { stage: 'expired' },
        canActivate: [inStage('expired')],
      },
      {
        path: 'error',
        component: StatusPage,
        data: { stage: 'error' },
        canActivate: [inStage('error')],
      },
      {
        path: 'check-in/welcome',
        component: WelcomePage,
        canActivate: [inStage('ready')],
      },
      // Every other address, and an empty one, goes to the page for the current stage.
      { path: '**', children: [], canActivate: [inStage()] },
    ],
  },
] satisfies Routes;
