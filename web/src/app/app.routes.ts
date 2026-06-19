import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./interview/interview-routes').then(m => m.INTERVIEW_ROUTES)
      },
      {
        path: 'interview',
        loadChildren: () =>
          import('./interview/interview-routes').then(m => m.INTERVIEW_ROUTES)
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/dashboard-routes').then(m => m.DASHBOARD_ROUTES)
      }
    ]
  }
];
