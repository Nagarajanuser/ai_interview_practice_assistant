import { Routes } from '@angular/router';

export const INTERVIEW_ROUTES: Routes = [

    {
        path: '',
        loadComponent: () =>
        import('./pages/interview-progress/interview-progress')
            .then(m => m.InterviewProgress)
    },
    {
        path: 'start',
        loadComponent: () =>
        import('./pages/interview-start/interview-start')
            .then(m => m.InterviewStart)
    },
    {
        path: 'end',
        loadComponent: () =>
        import('./pages/interview-end/interview-end')
            .then(m => m.InterviewEnd)
    }

];