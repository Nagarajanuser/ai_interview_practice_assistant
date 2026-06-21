import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard)
  },
  {
    path: 'questions',
    loadComponent: () =>
      import('./pages/all-question-answer/all-question-answer').then(m => m.AllQuestionAnswer)
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./pages/add-new-question-answer/add-new-question-answer').then(m => m.AddNewQuestionAnswer)
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/edit-question-answer/edit-question-answer').then(m => m.EditQuestionAnswer)
  },
  {
    path: 'topics',
    loadComponent: () =>
      import('./pages/manage-topics/manage-topics').then(m => m.ManageTopics)
  },
  {
    path: 'topics/add',
    loadComponent: () =>
      import('./pages/add-topic/add-topic').then(m => m.AddTopic)
  },
  {
    path: 'topics/edit/:name',
    loadComponent: () =>
      import('./pages/edit-topic/edit-topic').then(m => m.EditTopic)
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./pages/manage-roles/manage-roles').then(m => m.ManageRoles)
  },
  {
    path: 'roles/add',
    loadComponent: () =>
      import('./pages/add-role/add-role').then(m => m.AddRole)
  },
  {
    path: 'roles/edit/:name',
    loadComponent: () =>
      import('./pages/edit-role/edit-role').then(m => m.EditRole)
  },
  {
    path: 'sessions',
    loadComponent: () =>
      import('./pages/manage-sessions/manage-sessions').then(m => m.ManageSessions)
  },
  {
    path: 'sessions/create',
    loadComponent: () =>
      import('./pages/create-session/create-session').then(m => m.CreateSession)
  }
];
