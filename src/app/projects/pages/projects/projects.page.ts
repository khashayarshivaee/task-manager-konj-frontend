import {
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  Router,
} from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  calendarOutline,
  checkmarkCircleOutline,
  folderOpenOutline,
} from 'ionicons/icons';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
  tap,
} from 'rxjs';

import {
  AuthService,
} from '../../../core/services/auth.service';
import {
  Workspace,
} from '../../../workspaces/models/workspace.model';
import {
  WorkspaceService,
} from '../../../workspaces/services/workspace.service';
import {
  CreateProjectModalComponent,
} from '../../components/create-project-modal/create-project-modal.component';
import {
  Project,
} from '../../models/project.model';
import {
  ProjectService,
} from '../../services/project.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class ProjectsPage implements OnInit {
  private readonly authService =
    inject(AuthService);

  private readonly workspaceService =
    inject(WorkspaceService);

  private readonly projectService =
    inject(ProjectService);

  private readonly modalController =
    inject(ModalController);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  activeWorkspace: Workspace | null = null;

  projects: Project[] = [];

  isLoadingWorkspace = true;

  isLoadingProjects = false;

  workspaceLoadError = '';

  projectLoadError = '';

  noticeMessage = '';

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      calendarOutline,
      checkmarkCircleOutline,
      folderOpenOutline,
    });
  }

  ngOnInit(): void {
    this.watchActiveWorkspace();
    this.loadWorkspaces();
  }

  private watchActiveWorkspace(): void {
    this.workspaceService
      .activeWorkspace$
      .pipe(
        distinctUntilChanged(
          (
            previousWorkspace,
            currentWorkspace,
          ) =>
            previousWorkspace?.id ===
            currentWorkspace?.id,
        ),

        tap((workspace) => {
          this.activeWorkspace =
            workspace;

          this.projects = [];
          this.projectLoadError = '';
          this.noticeMessage = '';
        }),

        switchMap((workspace) => {
          if (!workspace) {
            this.isLoadingProjects =
              false;

            return of(null);
          }

          this.isLoadingProjects = true;

          return this.projectService
            .getProjects(
              workspace.id,
            )
            .pipe(
              tap((response) => {
                this.projects =
                  response.data.projects;
              }),

              catchError(() => {
                this.projects = [];

                this.projectLoadError =
                  'Unable to load projects for this workspace.';

                return of(null);
              }),

              finalize(() => {
                this.isLoadingProjects =
                  false;
              }),
            );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe();
  }

  private loadWorkspaces(): void {
    this.isLoadingWorkspace = true;
    this.workspaceLoadError = '';

    this.workspaceService
      .loadWorkspaces()
      .pipe(
        finalize(() => {
          this.isLoadingWorkspace =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        error: () => {
          this.workspaceLoadError =
            'Unable to load your workspaces. Please try again.';
        },
      });
  }

  retry(): void {
    this.projectLoadError = '';
    this.workspaceLoadError = '';

    this.loadWorkspaces();
  }

  canManageProjects(): boolean {
    const workspace =
      this.activeWorkspace;

    const currentUser =
      this.authService.getCurrentUser();

    if (
      !workspace ||
      !currentUser
    ) {
      return false;
    }

    if (
      workspace.owner_id ===
      currentUser.id
    ) {
      return true;
    }

    const membershipRole =
      workspace.membership?.role ??
      workspace.memberships?.find(
        (membership) =>
          membership.user_id ===
          currentUser.id,
      )?.role;

    return (
      membershipRole === 'owner' ||
      membershipRole === 'admin'
    );
  }

  async createProject(): Promise<void> {
    const workspace =
      this.activeWorkspace;

    if (!workspace) {
      return;
    }

    this.noticeMessage = '';

    const modal =
      await this.modalController.create({
        component:
        CreateProjectModalComponent,

        componentProps: {
          workspaceId: workspace.id,
        },

        cssClass:
          'project-create-modal',

        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<Project>();

    if (
      result.role === 'created' &&
      result.data
    ) {
      this.projects = [
        result.data,
        ...this.projects,
      ];

      this.noticeMessage =
        'Project created successfully.';
    }
  }

  openProject(
    project: Project,
  ): void {
    const workspace =
      this.activeWorkspace;

    if (
      !workspace ||
      project.workspace_id !==
      workspace.id
    ) {
      return;
    }

    void this.router.navigate([
      '/workspaces',
      workspace.id,
      'projects',
      project.id,
    ]);
  }

  getStatusLabel(
    project: Project,
  ): string {
    return project.status
      .replace('_', ' ');
  }

  getDueDate(
    project: Project,
  ): string {
    if (!project.due_at) {
      return 'No due date';
    }

    const dueAt =
      new Date(project.due_at);

    if (
      Number.isNaN(
        dueAt.getTime(),
      )
    ) {
      return project.due_at;
    }

    return dueAt.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      },
    );
  }

  goHome(): void {
    void this.router.navigateByUrl(
      '/home',
    );
  }

  openWorkspaces(): void {
    void this.router.navigateByUrl(
      '/workspaces',
    );
  }
}
