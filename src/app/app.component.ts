import {
  Component,
  HostListener,
  OnDestroy,
} from '@angular/core';
import {
  IonApp,
  IonRouterOutlet,
  ModalController,
} from '@ionic/angular/standalone';
import {
  Router,
} from '@angular/router';

import {
  PushNotificationService,
} from './core/services/push-notification.service';

import {
  firstValueFrom,
  Subscription,
} from 'rxjs';

import {
  AuthService,
} from './core/services/auth.service';
import {
  RealtimeService,
} from './core/services/realtime.service';

import {
  NotificationService,
} from './notifications/services/notification.service';

import {
  GlobalSearchLauncherService,
} from './search/services/global-search-launcher.service';

import {
  GlobalSearchModalComponent,
} from './search/components/global-search-modal/global-search-modal.component';

import {
  GlobalSearchResult,
} from './search/models/global-search.model';

import {
  WorkspaceService,
} from './workspaces/services/workspace.service';

import {
  TaskDetailsModalComponent,
} from './tasks/components/task-details-modal/task-details-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonApp,
    IonRouterOutlet,
  ],
})
export class AppComponent implements OnDestroy {
  private readonly authSubscription:
    Subscription;

  private readonly searchSubscription:
    Subscription;

  private readonly pushActionSubscription:
    Subscription;

  private activeUserId:
    | number
    | null = null;

  private isGlobalSearchOpen =
    false;

  constructor(
    private readonly authService:
      AuthService,

    private readonly realtimeService:
      RealtimeService,

    private readonly notificationService:
      NotificationService,

    private readonly pushNotificationService:
      PushNotificationService,

    private readonly searchLauncher:
      GlobalSearchLauncherService,

    private readonly workspaceService:
      WorkspaceService,

    private readonly modalController:
      ModalController,

    private readonly router:
      Router,
  ) {
    this.authSubscription =
      this.authService.currentUser$
        .subscribe((user) => {
          if (user) {
            if (
              this.activeUserId !==
              user.id
            ) {
              this.notificationService.reset();

              this.activeUserId =
                user.id;
            }

            /*
             * An authenticated but unverified user
             * must remain on the verification flow.
             * Do not start application realtime
             * services until the email is verified.
             */
            if (!user.email_verified_at) {
              this.notificationService.reset();
              this.realtimeService.disconnect();

              return;
            }

            this.realtimeService.connect(
              user.id,
            );

            void this.notificationService
              .initialize()
              .catch(() => {
                /*
                 * Realtime remains connected
                 * if the initial request fails.
                 */
              });

            void this.pushNotificationService
              .initialize()
              .catch((error) => {
                console.error(
                  '[Push] Initialization failed:',
                  error,
                );
              });

            return;
          }

          this.activeUserId = null;

          this.notificationService.reset();
          this.realtimeService.disconnect();
        });

    this.searchSubscription =
      this.searchLauncher.open$
        .subscribe(() => {
          void this.openGlobalSearch();
        });

    this.pushActionSubscription =
      this.pushNotificationService
        .action$
        .subscribe((data) => {
          void this.openPushNotification(
            data,
          );
        });
  }

  @HostListener(
    'document:keydown',
    ['$event'],
  )
  handleGlobalSearchShortcut(
    event: KeyboardEvent,
  ): void {
    const isSearchShortcut =
      (
        event.metaKey ||
        event.ctrlKey
      ) &&
      event.key.toLowerCase() ===
      'k';

    if (!isSearchShortcut) {
      return;
    }

    const currentUser =
      this.authService.getCurrentUser();

    if (
      !currentUser ||
      !currentUser.email_verified_at
    ) {
      return;
    }

    event.preventDefault();

    this.searchLauncher.open();
  }

  private async openGlobalSearch():
    Promise<void> {
    const currentUser =
      this.authService.getCurrentUser();

    if (
      this.isGlobalSearchOpen ||
      !currentUser ||
      !currentUser.email_verified_at
    ) {
      return;
    }

    /*
     * Avoid stacking Global Search on top
     * of another Ionic modal.
     */
    const currentModal =
      await this.modalController.getTop();

    if (currentModal) {
      return;
    }

    this.isGlobalSearchOpen = true;

    try {
      const modal =
        await this.modalController.create({
          component:
          GlobalSearchModalComponent,

          cssClass:
            'global-search-modal',

          backdropDismiss: true,
        });

      await modal.present();

      const result =
        await modal
          .onDidDismiss<
            GlobalSearchResult
          >();

      if (
        result.role !== 'selected' ||
        !result.data
      ) {
        return;
      }

      await this.openSearchResult(
        result.data,
      );
    } finally {
      this.isGlobalSearchOpen = false;
    }
  }

  private async openSearchResult(
    result: GlobalSearchResult,
  ): Promise<void> {
    switch (result.type) {
      case 'workspace':
        await this.openWorkspaceResult(
          result,
        );

        return;

      case 'project':
        if (
          result.project_id === null
        ) {
          return;
        }

        await this.router.navigate([
          '/workspaces',
          result.workspace_id,
          'projects',
          result.project_id,
        ]);

        return;

      case 'task':
      case 'comment':
        await this.openTaskResult(
          result,
        );

        return;
    }
  }

  private async openWorkspaceResult(
    result: GlobalSearchResult,
  ): Promise<void> {
    let workspace =
      this.workspaceService
        .getWorkspaces()
        .find(
          (item) =>
            item.id ===
            result.workspace_id,
        );

    if (!workspace) {
      try {
        const workspaces =
          await firstValueFrom(
            this.workspaceService
              .loadWorkspaces(),
          );

        workspace =
          workspaces.find(
            (item) =>
              item.id ===
              result.workspace_id,
          );
      } catch {
        return;
      }
    }

    if (!workspace) {
      return;
    }

    this.workspaceService
      .setActiveWorkspace(
        workspace,
      );

    await this.router
      .navigateByUrl('/home');
  }

  private async openTaskResult(
    result: GlobalSearchResult,
  ): Promise<void> {
    if (
      result.project_id === null ||
      result.task_id === null
    ) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        TaskDetailsModalComponent,

        componentProps: {
          workspaceId:
          result.workspace_id,

          projectId:
          result.project_id,

          taskId:
          result.task_id,
        },

        cssClass:
          'project-create-modal',

        backdropDismiss: false,
      });

    await modal.present();
    await modal.onDidDismiss();
  }
  private async openPushNotification(
    data: Record<string, unknown>,
  ): Promise<void> {
    const currentUser =
      this.authService.getCurrentUser();

    if (
      !currentUser ||
      !currentUser.email_verified_at
    ) {
      return;
    }

    const workspaceId =
      this.pushNumber(
        data['workspace_id'],
      );

    const projectId =
      this.pushNumber(
        data['project_id'],
      );

    const taskId =
      this.pushNumber(
        data['task_id'],
      );

    const notificationId =
      this.pushNumber(
        data['notification_id'],
      );

    const activityType =
      typeof data['activity_type'] ===
      'string'
        ? data['activity_type']
        : null;

    if (
      workspaceId === null ||
      projectId === null
    ) {
      return;
    }

    /*
     * Marking the notification as read
     * must never block navigation.
     */
    if (notificationId !== null) {
      try {
        await this.notificationService
          .markAsRead(
            notificationId,
          );
      } catch {
        // Continue navigation.
      }
    }

    /*
     * A deleted task no longer has a
     * Task Details endpoint to open.
     */
    if (
      taskId !== null &&
      activityType !== 'task_deleted'
    ) {
      const currentModal =
        await this.modalController
          .getTop();

      if (currentModal) {
        await currentModal.dismiss();
      }

      const modal =
        await this.modalController.create({
          component:
          TaskDetailsModalComponent,

          componentProps: {
            workspaceId,
            projectId,
            taskId,
          },

          cssClass:
            'project-create-modal',

          backdropDismiss: false,
        });

      await modal.present();
      await modal.onDidDismiss();

      return;
    }

    await this.router.navigate([
      '/workspaces',
      workspaceId,
      'projects',
      projectId,
    ]);
  }

  private pushNumber(
    value: unknown,
  ): number | null {
    if (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value > 0
    ) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      const parsed =
        Number(value);

      if (
        Number.isInteger(parsed) &&
        parsed > 0
      ) {
        return parsed;
      }
    }

    return null;
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
    this.searchSubscription.unsubscribe();
    this.pushActionSubscription.unsubscribe();

    this.notificationService.reset();
    this.realtimeService.disconnect();
  }
}
