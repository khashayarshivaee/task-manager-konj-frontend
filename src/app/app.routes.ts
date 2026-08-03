import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in | Konj Task Manager',
    loadComponent: () =>
      import('./auth/login/login.page')
        .then((module) => module.LoginPage),
  },
  {
    path: 'home',
    title: 'Dashboard | Konj Task Manager',
    canActivate: [
      authGuard,
    ],
    loadComponent: () =>
      import('./home/home.page')
        .then((module) => module.HomePage),
  },

  {
    path: 'profile',
    title: 'Profile Settings | Konj Task Manager',
    canActivate: [
      authGuard,
    ],
    loadComponent: () =>
      import(
        './profile/pages/profile-settings/profile-settings.page'
        ).then(
        (module) =>
          module.ProfileSettingsPage,
      ),
  },

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'workspaces/:workspaceId/members',
    title: 'Workspace Members | Konj Task Manager',
    canActivate: [
      authGuard,
    ],
    loadComponent: () =>
      import(
        './workspaces/pages/workspace-members/workspace-members.page'
        ).then(
        (module) =>
          module.WorkspaceMembersPage,
      ),
  },

  {
    path: 'workspaces/:workspaceId/projects/:projectId',
    title: 'Project | Konj Task Manager',
    canActivate: [
      authGuard,
    ],
    loadComponent: () =>
      import(
        './projects/pages/project-details/project-details.page'
        ).then(
        (module) => module.ProjectDetailsPage,
      ),
  },


  {
    path: '**',
    redirectTo: 'home',
  },
];
