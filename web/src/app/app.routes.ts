import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { authGuard, noAuthGuard } from './login/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('./login/login-routes').then(m => m.LOGIN_ROUTES)
  },
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'interview',
        loadChildren: () =>
          import('./interview/interview-routes').then(m => m.INTERVIEW_ROUTES)
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/dashboard-routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./admin/admin-routes').then(m => m.ADMIN_ROUTES)
      }
    ]
  }
];
