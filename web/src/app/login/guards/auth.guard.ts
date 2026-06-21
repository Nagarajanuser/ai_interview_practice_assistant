import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard to prevent unauthenticated access to application routes.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const user = localStorage.getItem('user');

  if (user) {
    return true;
  }

  // Redirect to login if user is not authenticated
  router.navigate(['/auth']);
  return false;
};

/**
 * Guard to redirect authenticated users away from authentication pages to the dashboard.
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const user = localStorage.getItem('user');

  if (!user) {
    return true;
  }

  // Redirect to dashboard if user is already authenticated
  router.navigate(['/dashboard']);
  return false;
};
