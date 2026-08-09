import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

import {
  verifiedGuard,
} from './core/guards/verified.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in | Konj Task Manager',
    loadComponent: () =>
      import('./auth/login/login.page')
        .then(
          (module) =>
            module.LoginPage,
        ),
  },

  {
    path: 'register',
    title: 'Create account | Konj Task Manager',

    loadComponent: () =>
      import(
        './auth/register/register.page'
        )
        .then(
          (module) =>
            module.RegisterPage,
        ),
  },

  {
    path: 'email/verify',
    title:
      'Email verification | Konj Task Manager',

    loadComponent: () =>
      import(
        './auth/email-verification/email-verification.page'
        ).then(
        (module) =>
          module.EmailVerificationPage,
      ),
  },

  {
    path: 'verify-email',
    title: 'Verify email | Konj Task Manager',

    canActivate: [
      authGuard,
    ],

    loadComponent: () =>
      import(
        './auth/verify-email/verify-email.page'
        ).then(
        (module) =>
          module.VerifyEmailPage,
      ),
  },

  {
    path: 'home',
    title: 'Dashboard | Konj Task Manager',
    canActivate: [
      authGuard,
      verifiedGuard,
    ],
    loadComponent: () =>
      import('./home/home.page')
        .then(
          (module) =>
            module.HomePage,
        ),
  },

  {
    path: 'workspaces',
    title: 'Workspaces | Konj Task Manager',
    canActivate: [
      authGuard,
      verifiedGuard,
    ],
    loadComponent: () =>
      import(
        './workspaces/pages/workspaces/workspaces.page'
        ).then(
        (module) =>
          module.WorkspacesPage,
      ),
  },

  {
    path: 'projects',
    title: 'Projects | Konj Task Manager',
    canActivate: [
      authGuard,
      verifiedGuard,
    ],
    loadComponent: () =>
      import(
        './projects/pages/projects/projects.page'
        ).then(
        (module) =>
          module.ProjectsPage,
      ),
  },

  {
    path: 'tasks',
    title: 'Tasks | Konj Task Manager',
    canActivate: [
      authGuard,
      verifiedGuard,
    ],
    loadComponent: () =>
      import(
        './tasks/pages/tasks/tasks.page'
        ).then(
        (module) =>
          module.TasksPage,
      ),
  },

  {
    path: 'settings',
    title: 'Settings | Konj Task Manager',
    canActivate: [
      authGuard,
      verifiedGuard,
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
    path: 'profile',
    redirectTo: 'settings',
    pathMatch: 'full',
  },

  {
    path: 'workspaces/:workspaceId/members',
    title: 'Workspace Members | Konj Task Manager',
    canActivate: [
      authGuard,
      verifiedGuard,
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
      verifiedGuard,
    ],
    loadComponent: () =>
      import(
        './projects/pages/project-details/project-details.page'
        ).then(
        (module) =>
          module.ProjectDetailsPage,
      ),
  },

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: 'home',
  },
];
