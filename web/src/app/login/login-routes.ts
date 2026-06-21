import { Routes } from '@angular/router';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login').then(m => m.Login)
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup').then(m => m.Signup)
  },
  {
    path: 'password-reset',
    loadComponent: () => import('./pages/password-reset/password-reset').then(m => m.PasswordReset)
  }
];
