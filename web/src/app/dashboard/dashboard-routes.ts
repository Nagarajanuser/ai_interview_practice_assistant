import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [

    {
        path: '',
        loadComponent: () =>
        import('./pages/home/home')
            .then(m => m.Home)
    },
    {
        path: 'profile',
        loadComponent: () =>
        import('./pages/profile/profile')
            .then(m => m.Profile)
    }
]