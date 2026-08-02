import { AsyncPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  checkmarkCircleOutline,
  checkboxOutline,
  chevronDownOutline,
  closeOutline,
  folderOpenOutline,
  gridOutline,
  homeOutline,
  logOutOutline,
  menuOutline,
  notificationsOutline,
  peopleOutline,
  rocketOutline,
  searchOutline,
  settingsOutline,
} from 'ionicons/icons';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import {
  CreateWorkspaceModalComponent,
} from '../workspaces/components/create-workspace-modal/create-workspace-modal.component';
import { WorkspaceService } from '../workspaces/services/workspace.service';

import {
  CreateProjectModalComponent,
} from '../projects/components/create-project-modal/create-project-modal.component';
import {
  Project,
} from '../projects/models/project.model';
import {
  ProjectService,
} from '../projects/services/project.service';

import {
  Workspace,
} from '../workspaces/models/workspace.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    AsyncPipe,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class HomePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly workspaceService = inject(WorkspaceService);

  private readonly projectService =
    inject(ProjectService);

  private readonly destroyRef =
    inject(DestroyRef);
  private readonly modalController = inject(ModalController);
  private readonly router = inject(Router);

  readonly currentUser$ = this.authService.currentUser$;
  readonly activeWorkspace$ =
    this.workspaceService.activeWorkspace$;

  readonly workspaces$ =
    this.workspaceService.workspaces$;

  projects: Project[] = [];

  isLoadingProjects = false;
  projectLoadError = '';
  showProjectNotice = false;

  isSidebarOpen = false;
  isLoggingOut = false;
  isLoadingWorkspaces = false;
  workspaceLoadError = '';
  showWorkspaceNotice = false;
  isWorkspaceMenuOpen = false;
  @ViewChild('workspaceSwitcher')
  private workspaceSwitcher?: ElementRef<HTMLElement>;

  constructor() {
    addIcons({
      addOutline,
      calendarOutline,
      checkmarkCircleOutline,
      checkboxOutline,
      chevronDownOutline,
      closeOutline,
      folderOpenOutline,
      gridOutline,
      homeOutline,
      logOutOutline,
      menuOutline,
      notificationsOutline,
      peopleOutline,
      rocketOutline,
      searchOutline,
      settingsOutline,
    });
  }

  ngOnInit(): void {
    this.watchActiveWorkspace();
    this.loadWorkspaces();
  }

  private watchActiveWorkspace(): void {
    this.activeWorkspace$
      .pipe(
        distinctUntilChanged(
          (previousWorkspace, currentWorkspace) =>
            previousWorkspace?.id ===
            currentWorkspace?.id,
        ),

        tap(() => {
          this.projects = [];
          this.projectLoadError = '';
          this.showProjectNotice = false;
        }),

        switchMap((workspace) => {
          if (!workspace) {
            this.isLoadingProjects = false;

            return of(null);
          }

          this.isLoadingProjects = true;

          return this.projectService
            .getProjects(workspace.id)
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
                this.isLoadingProjects = false;
              }),
            );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private loadWorkspaces(): void {
    this.isLoadingWorkspaces = true;
    this.workspaceLoadError = '';

    this.workspaceService
      .loadWorkspaces()
      .pipe(
        finalize(() => {
          this.isLoadingWorkspaces = false;
        }),
      )
      .subscribe({
        error: () => {
          this.workspaceLoadError =
            'Unable to load your workspaces. Please refresh the page.';
        },
      });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }
  toggleWorkspaceMenu(
    event: MouseEvent,
  ): void {
    event.stopPropagation();

    this.isWorkspaceMenuOpen =
      !this.isWorkspaceMenuOpen;
  }

  closeWorkspaceMenu(): void {
    this.isWorkspaceMenuOpen = false;
  }

  selectWorkspace(
    workspace: Workspace,
  ): void {
    if (
      this.workspaceService
        .getActiveWorkspace()
        ?.id === workspace.id
    ) {
      this.closeWorkspaceMenu();

      return;
    }

    this.workspaceService
      .setActiveWorkspace(workspace);

    this.showWorkspaceNotice = false;
    this.closeWorkspaceMenu();
    this.closeSidebar();
  }

  isWorkspaceActive(
    workspace: Workspace,
  ): boolean {
    return (
      this.workspaceService
        .getActiveWorkspace()
        ?.id === workspace.id
    );
  }

  getWorkspaceRole(
    workspace: Workspace,
  ): string {
    const currentUser =
      this.authService.getCurrentUser();

    if (
      currentUser &&
      workspace.owner_id === currentUser.id
    ) {
      return 'Owner';
    }

    const membershipRole =
      workspace.membership?.role ??
      workspace.memberships?.find(
        (membership) =>
          membership.user_id === currentUser?.id,
      )?.role;

    if (!membershipRole) {
      return 'Member';
    }

    return (
      membershipRole.charAt(0).toUpperCase() +
      membershipRole.slice(1)
    );
  }

  openCreateWorkspaceFromMenu(): void {
    this.closeWorkspaceMenu();

    void this.showCreateWorkspaceNotice();
  }

  retryLoadWorkspaces(): void {
    this.loadWorkspaces();
  }

  async showCreateWorkspaceNotice(): Promise<void> {
    this.closeWorkspaceMenu();
    const modal = await this.modalController.create({
      component: CreateWorkspaceModalComponent,
      cssClass: 'workspace-create-modal',
      backdropDismiss: false,
    });

    await modal.present();

    const result = await modal.onDidDismiss();

    if (result.role === 'created') {
      this.showWorkspaceNotice = true;
    }
  }

  async showCreateProjectModal(): Promise<void> {
    const workspace =
      this.workspaceService.getActiveWorkspace();

    if (!workspace) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        CreateProjectModalComponent,

        componentProps: {
          workspaceId: workspace.id,
        },

        cssClass: 'project-create-modal',
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

      this.showProjectNotice = true;
    }
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.isLoggingOut = false;
          this.workspaceService.resetWorkspaceState();
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/login');
        },
        error: () => {
          void this.router.navigateByUrl('/login');
        },
      });
  }

  getInitials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  getFirstName(name: string): string {
    return name.trim().split(/\s+/)[0] || 'there';
  }

  @HostListener(
    'document:click',
    ['$event'],
  )
  handleDocumentClick(
    event: MouseEvent,
  ): void {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (
      this.workspaceSwitcher
        ?.nativeElement
        .contains(target)
    ) {
      return;
    }

    this.closeWorkspaceMenu();
  }

  @HostListener(
    'document:keydown.escape',
  )
  handleEscapeKey(): void {
    this.closeWorkspaceMenu();
  }

  retryLoadProjects(): void {
    const workspace =
      this.workspaceService.getActiveWorkspace();

    if (
      !workspace ||
      this.isLoadingProjects
    ) {
      return;
    }

    this.isLoadingProjects = true;
    this.projectLoadError = '';

    this.projectService
      .getProjects(workspace.id)
      .pipe(
        finalize(() => {
          this.isLoadingProjects = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.projects =
            response.data.projects;
        },

        error: () => {
          this.projects = [];

          this.projectLoadError =
            'Unable to load projects for this workspace.';
        },
      });
  }

  canManageProjects(
    workspace: Workspace,
  ): boolean {
    const currentUser =
      this.authService.getCurrentUser();

    if (!currentUser) {
      return false;
    }

    if (
      workspace.owner_id === currentUser.id
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

  openProject(
    project: Project,
  ): void {
    const workspace =
      this.workspaceService.getActiveWorkspace();

    if (
      !workspace ||
      workspace.id !== project.workspace_id
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
}
