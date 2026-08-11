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
  GlobalSearchLauncherService,
} from '../search/services/global-search-launcher.service';

import {
  ActivityNotification,
} from '../notifications/models/notification.model';

import {
  NotificationService,
} from '../notifications/services/notification.service';

import {
  ProjectActivityPresenterService,
} from '../projects/services/project-activity-presenter.service';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import {
  TaskDetailsModalComponent,
} from '../tasks/components/task-details-modal/task-details-modal.component';

import {
  DeleteWorkspaceModalComponent,
} from '../workspaces/components/delete-workspace-modal/delete-workspace-modal.component';

import {
  EditWorkspaceModalComponent,
} from '../workspaces/components/edit-workspace-modal/edit-workspace-modal.component';

import {
  UserAvatarComponent,
} from '../shared/components/user-avatar/user-avatar.component';
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
  menu,
  createOutline,
  trashOutline,
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
  documentTextOutline,
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
  WorkspaceDashboard,
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
    UserAvatarComponent,
  ],
})
export class HomePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly workspaceService = inject(WorkspaceService);

  private readonly globalSearchLauncher =
    inject(GlobalSearchLauncherService);

  private readonly projectService =
    inject(ProjectService);

  private readonly notificationService =
    inject(NotificationService);

  private readonly activityPresenter =
    inject(ProjectActivityPresenterService);

  private readonly destroyRef =
    inject(DestroyRef);
  private readonly modalController = inject(ModalController);
  private readonly router = inject(Router);

  readonly currentUser$ = this.authService.currentUser$;
  readonly activeWorkspace$ =
    this.workspaceService.activeWorkspace$;

  readonly notifications$ =
    this.notificationService.notifications$;

  readonly notificationUnreadCount$ =
    this.notificationService.unreadCount$;

  readonly notificationsLoading$ =
    this.notificationService.loading$;

  readonly workspaces$ =
    this.workspaceService.workspaces$;

  projects: Project[] = [];

  dashboard: WorkspaceDashboard | null = null;

  isLoadingDashboard = false;
  dashboardLoadError = '';

  isNotificationsOpen = false;
  isMarkingAllNotificationsRead = false;

  @ViewChild('notificationMenu')
  private notificationMenu?: ElementRef<HTMLElement>;

  isLoadingProjects = false;
  projectLoadError = '';
  showProjectNotice = false;

  isSidebarOpen = false;
  isLoggingOut = false;
  isLoadingWorkspaces = false;
  workspaceLoadError = '';
  showWorkspaceNotice = false;
  showWorkspaceUpdatedNotice = false;
  showWorkspaceDeletedNotice = false;
  isWorkspaceMenuOpen = false;

  isMobileViewport =
    window.matchMedia(
      '(max-width: 900px)',
    ).matches;
  @HostListener('window:resize')
  handleViewportResize(): void {
    this.isMobileViewport =
      window.matchMedia(
        '(max-width: 900px)',
      ).matches;

    if (
      !this.isMobileViewport &&
      this.isSidebarOpen
    ) {
      this.isSidebarOpen = false;
    }
  }
  @ViewChild('workspaceSwitcher')
  private workspaceSwitcher?: ElementRef<HTMLElement>;

  constructor() {
    addIcons({
      documentTextOutline,
      addOutline,
      menu,
      calendarOutline,
      checkmarkCircleOutline,
      checkboxOutline,
      createOutline,
      trashOutline,
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
    this.watchActiveWorkspaceDashboard();
    this.loadWorkspaces();
  }

  ionViewWillEnter(): void {
    const workspace =
      this.workspaceService
        .getActiveWorkspace();

    if (!workspace) {
      if (!this.isLoadingWorkspaces) {
        this.loadWorkspaces();
      }

      return;
    }

    if (!this.isLoadingProjects) {
      this.retryLoadProjects();
    }

    if (!this.isLoadingDashboard) {
      this.retryLoadDashboard();
    }
  }

  openGlobalSearch(): void {
    this.closeWorkspaceMenu();
    this.closeNotifications();

    this.globalSearchLauncher.open();
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

  private watchActiveWorkspaceDashboard(): void {
    this.activeWorkspace$
      .pipe(
        distinctUntilChanged(
          (
            previousWorkspace,
            currentWorkspace,
          ) =>
            previousWorkspace?.id ===
            currentWorkspace?.id,
        ),

        tap(() => {
          this.dashboard = null;
          this.dashboardLoadError = '';
        }),

        switchMap((workspace) => {
          if (!workspace) {
            this.isLoadingDashboard = false;

            return of(null);
          }

          this.isLoadingDashboard = true;

          return this.workspaceService
            .getDashboard(workspace.id)
            .pipe(
              tap((dashboard) => {
                this.dashboard = dashboard;
              }),

              catchError(() => {
                this.dashboard = null;

                this.dashboardLoadError =
                  'Unable to load workspace statistics.';

                return of(null);
              }),

              finalize(() => {
                this.isLoadingDashboard = false;
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
      this.retryLoadDashboard();
    }
  }
  // openProfile(): void {
  //   this.closeWorkspaceMenu();
  //   this.closeSidebar();
  //
  //   void this.router.navigateByUrl(
  //     '/profile',
  //   );
  // }

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

          this.workspaceService
            .resetWorkspaceState();
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

  // getInitials(name: string): string {
  //   const parts = name
  //     .trim()
  //     .split(/\s+/)
  //     .filter(Boolean)
  //     .slice(0, 2);
  //
  //   return parts
  //     .map((part) => part.charAt(0).toUpperCase())
  //     .join('');
  // }

  getFirstName(name: string): string {
    return name.trim().split(/\s+/)[0] || 'there';
  }

  get setupCompletedSteps(): number {
    return (
      this.dashboard?.setup.completed_steps ??
      1
    );
  }

  get setupTotalSteps(): number {
    return (
      this.dashboard?.setup.total_steps ??
      4
    );
  }

  get setupProgressPercentage(): number {
    return (
      this.dashboard
        ?.setup
        .completion_percentage ??
      25
    );
  }

  isSetupStepComplete(
    step:
      keyof WorkspaceDashboard[
        'setup'
        ]['steps'],
  ): boolean {
    if (!this.dashboard) {
      return step === 'account_created';
    }

    return this.dashboard
      .setup
      .steps[step];
  }

  toggleNotifications(
    event: MouseEvent,
  ): void {
    event.stopPropagation();

    this.isNotificationsOpen =
      !this.isNotificationsOpen;

    if (this.isNotificationsOpen) {
      this.closeWorkspaceMenu();
    }
  }

  closeNotifications(): void {
    this.isNotificationsOpen = false;
  }

  async markAllNotificationsAsRead(
    event: MouseEvent,
  ): Promise<void> {
    event.stopPropagation();

    if (this.isMarkingAllNotificationsRead) {
      return;
    }

    this.isMarkingAllNotificationsRead =
      true;

    try {
      await this.notificationService
        .markAllAsRead();
    } finally {
      this.isMarkingAllNotificationsRead =
        false;
    }
  }

  async markNotificationAsRead(
    notification: ActivityNotification,
  ): Promise<void> {
    if (
      notification.notification.is_read
    ) {
      return;
    }

    await this.notificationService
      .markAsRead(
        notification.notification.id,
      );
  }

  async openNotification(
    notification: ActivityNotification,
  ): Promise<void> {
    if (
      !notification
        .notification
        .is_read
    ) {
      try {
        await this.markNotificationAsRead(
          notification,
        );
      } catch {
        /*
         * Opening the related task should
         * still be possible if marking the
         * notification as read fails.
         */
      }
    }

    this.closeNotifications();

    const taskId =
      this.getNotificationTaskId(
        notification,
      );

    if (taskId === null) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        TaskDetailsModalComponent,

        componentProps: {
          workspaceId:
          notification.workspace_id,

          projectId:
          notification.project_id,

          taskId,
        },

        cssClass:
          'project-create-modal',

        backdropDismiss: false,
      });

    await modal.present();

    await modal.onDidDismiss();
  }

  private getNotificationTaskId(
    notification: ActivityNotification,
  ): number | null {
    if (
      notification.type ===
      'task_deleted'
    ) {
      return null;
    }

    if (
      notification.subject_type ===
      'task' &&
      notification.subject_id !== null
    ) {
      return notification.subject_id;
    }

    const metadataTaskId =
      notification.metadata?.['task_id'];

    if (
      typeof metadataTaskId ===
      'number' &&
      Number.isInteger(
        metadataTaskId,
      ) &&
      metadataTaskId > 0
    ) {
      return metadataTaskId;
    }

    return null;
  }

  getNotificationText(
    notification: ActivityNotification,
  ): string {
    return this.activityPresenter
      .getText(notification);
  }

  getNotificationActorName(
    notification: ActivityNotification,
  ): string {
    return this.activityPresenter
      .getActorName(notification);
  }

  getNotificationTime(
    notification: ActivityNotification,
  ): string {
    return this.activityPresenter
      .getTime(notification);
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

    const clickedWorkspaceSwitcher =
      this.workspaceSwitcher
        ?.nativeElement
        .contains(target)
      ?? false;

    const clickedNotificationMenu =
      this.notificationMenu
        ?.nativeElement
        .contains(target)
      ?? false;

    if (!clickedWorkspaceSwitcher) {
      this.closeWorkspaceMenu();
    }

    if (!clickedNotificationMenu) {
      this.closeNotifications();
    }
  }

  @HostListener(
    'document:keydown.escape',
  )
  handleEscapeKey(): void {
    this.closeWorkspaceMenu();
    this.closeNotifications();
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

  retryLoadDashboard(): void {
    const workspace =
      this.workspaceService.getActiveWorkspace();

    if (
      !workspace ||
      this.isLoadingDashboard
    ) {
      return;
    }

    this.isLoadingDashboard = true;
    this.dashboardLoadError = '';

    this.workspaceService
      .getDashboard(workspace.id)
      .pipe(
        finalize(() => {
          this.isLoadingDashboard = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (dashboard) => {
          this.dashboard = dashboard;
        },

        error: () => {
          this.dashboard = null;

          this.dashboardLoadError =
            'Unable to load workspace statistics.';
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
  canManageWorkspace(
    workspace: Workspace,
  ): boolean {
    return this.canManageProjects(workspace);
  }
  canDeleteWorkspace(
    workspace: Workspace,
  ): boolean {
    const currentUser =
      this.authService.getCurrentUser();

    return (
      currentUser !== null &&
      workspace.owner_id === currentUser.id
    );
  }

  openWorkspaceMembers(): void {
    const workspace =
      this.workspaceService.getActiveWorkspace();

    if (!workspace) {
      return;
    }

    this.closeWorkspaceMenu();
    this.closeSidebar();

    void this.router.navigate([
      '/workspaces',
      workspace.id,
      'members',
    ]);
  }
  openWorkspaceNotes(): void {
    const workspace =
      this.workspaceService
        .getActiveWorkspace();

    if (!workspace) {
      return;
    }

    this.closeWorkspaceMenu();
    this.closeSidebar();

    void this.router.navigate([
      '/workspaces',
      workspace.id,
      'notes',
    ]);
  }

  openWorkspaces(): void {
    this.closeWorkspaceMenu();
    this.closeSidebar();

    void this.router.navigateByUrl(
      '/workspaces',
    );
  }
  openTasks(): void {
    this.closeWorkspaceMenu();
    this.closeSidebar();

    void this.router.navigateByUrl(
      '/tasks',
    );
  }
  openProfile(): void {
    this.closeWorkspaceMenu();
    this.closeSidebar();

    void this.router.navigateByUrl(
      '/settings',
    );
  }

  openSettings(): void {
    this.closeWorkspaceMenu();
    this.closeSidebar();

    void this.router.navigateByUrl(
      '/settings',
    );
  }

  openProjects(): void {
    this.closeWorkspaceMenu();
    this.closeSidebar();

    void this.router.navigateByUrl(
      '/projects',
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

  async showEditWorkspaceModal(
    workspace: Workspace,
  ): Promise<void> {
    this.closeWorkspaceMenu();

    const modal =
      await this.modalController.create({
        component: EditWorkspaceModalComponent,

        componentProps: {
          workspace,
        },

        cssClass: 'workspace-edit-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<Workspace>();

    if (
      result.role === 'updated' &&
      result.data
    ) {
      this.showWorkspaceNotice = false;
      this.showWorkspaceDeletedNotice = false;
      this.showWorkspaceUpdatedNotice = true;
    }
  }

  async showDeleteWorkspaceModal(
    workspace: Workspace,
  ): Promise<void> {
    this.closeWorkspaceMenu();

    const modal =
      await this.modalController.create({
        component: DeleteWorkspaceModalComponent,

        componentProps: {
          workspace,
        },

        cssClass: 'workspace-delete-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<Workspace>();

    if (result.role === 'deleted') {
      this.showWorkspaceNotice = false;
      this.showWorkspaceUpdatedNotice = false;
      this.showWorkspaceDeletedNotice = true;
    }
  }
}
