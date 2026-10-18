
import {
  HttpClient,
} from '@angular/common/http';

import {
  Injectable,
  inject,
} from '@angular/core';

import {
  BehaviorSubject,
  firstValueFrom,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';

import {
  AuthService,
} from '../../core/services/auth.service';

import {
  RealtimeService,
} from '../../core/services/realtime.service';

import {
  ActivityNotification,
  ListNotificationsResponse,
  ListVpnUsageAlertsResponse,
  NotificationItem,
  ReadAllNotificationsResponse,
  ReadNotificationResponse,
  ReadVpnUsageAlertResponse,
  UnreadNotificationCountResponse,
  VpnUsageAlert,
  VpnUsageAlertUnreadCountResponse,
} from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http =
    inject(HttpClient);

  private readonly authService =
    inject(AuthService);

  private readonly realtimeService =
    inject(RealtimeService);

  private readonly vpnAdminEmail =
    'khashayarshivaee@gmail.com';

  private readonly notificationsSubject =
    new BehaviorSubject<
      ActivityNotification[]
    >([]);

  private readonly vpnAlertsSubject =
    new BehaviorSubject<
      VpnUsageAlert[]
    >([]);

  private readonly notificationItemsSubject =
    new BehaviorSubject<
      NotificationItem[]
    >([]);

  private readonly unreadCountSubject =
    new BehaviorSubject<number>(0);

  private readonly loadingSubject =
    new BehaviorSubject<boolean>(false);

  private readonly initializedSubject =
    new BehaviorSubject<boolean>(false);

  private projectUnreadCount = 0;
  private vpnUnreadCount = 0;

  private sessionVersion = 0;

  /*
   * Existing Project / Task notifications.
   *
   * Kept for backwards compatibility.
   */
  readonly notifications$ =
    this.notificationsSubject.asObservable();

  /*
   * VPN notifications.
   */
  readonly vpnAlerts$ =
    this.vpnAlertsSubject.asObservable();

  /*
   * Combined and sorted notifications.
   *
   * The Home page will use this
   * stream in the next step.
   */
  readonly notificationItems$ =
    this.notificationItemsSubject
      .asObservable();

  readonly unreadCount$ =
    this.unreadCountSubject.asObservable();

  readonly loading$ =
    this.loadingSubject.asObservable();

  readonly initialized$ =
    this.initializedSubject.asObservable();

  constructor() {
    this.listenToRealtime();
  }

  async initialize(): Promise<void> {
    if (
      this.initializedSubject.value ||
      this.loadingSubject.value
    ) {
      return;
    }

    const version = this.sessionVersion;

    this.loadingSubject.next(true);

    try {
      /*
       * Load existing project notifications.
       */
      const response = await firstValueFrom(
        this.http.get<ListNotificationsResponse>(
          `${environment.apiUrl}/notifications`,
          {
            params: {
              page: 1,
              per_page: 20,
            },
          },
        ),
      );

      if (version !== this.sessionVersion) {
        return;
      }

      this.notificationsSubject.next(
        response.data.notifications,
      );

      this.projectUnreadCount =
        response.data.unread_count;

      this.rebuildUnifiedState();

      /*
       * VPN notifications are restricted
       * to the authorized administrator.
       */
      if (this.isVpnAdmin()) {
        try {
          await this.refreshVpnAlerts();
        } catch (error) {
          /*
           * VPN notification failure
           * must not break existing
           * project notifications.
           */
          console.warn(
            '[Notifications] VPN alerts unavailable.',
            error,
          );
        }
      }

      if (version !== this.sessionVersion) {
        return;
      }

      this.initializedSubject.next(true);
    } finally {
      if (version === this.sessionVersion) {
        this.loadingSubject.next(false);
      }
    }
  }

  /*
   * Refresh VPN alerts.
   *
   * This will also be called when
   * the notification popover opens.
   */
  async refreshVpnAlerts(): Promise<void> {
    if (!this.isVpnAdmin()) {
      this.vpnAlertsSubject.next([]);
      this.vpnUnreadCount = 0;
      this.rebuildUnifiedState();
      return;
    }

    const version = this.sessionVersion;

    const response = await firstValueFrom(
      this.http.get<ListVpnUsageAlertsResponse>(
        `${environment.apiUrl}/vpn/usage/alerts`,
        {
          params: {
            page: 1,
            per_page: 20,
          },
        },
      ),
    );

    if (version !== this.sessionVersion) {
      return;
    }

    this.vpnAlertsSubject.next(
      response.data.alerts,
    );

    this.vpnUnreadCount =
      response.data.unread_count;

    this.rebuildUnifiedState();
  }

  /*
   * Refresh combined unread count.
   */
  async refreshUnreadCount(): Promise<void> {
    const version = this.sessionVersion;

    const response = await firstValueFrom(
      this.http.get<UnreadNotificationCountResponse>(
        `${environment.apiUrl}/notifications/unread-count`,
      ),
    );

    if (version !== this.sessionVersion) {
      return;
    }

    this.projectUnreadCount =
      response.data.unread_count;

    this.rebuildUnifiedState();

    if (!this.isVpnAdmin()) {
      return;
    }

    const vpnResponse = await firstValueFrom(
      this.http.get<VpnUsageAlertUnreadCountResponse>(
        `${environment.apiUrl}/vpn/usage/alerts/unread-count`,
      ),
    );

    if (version !== this.sessionVersion) {
      return;
    }

    this.vpnUnreadCount =
      vpnResponse.data.unread_count;

    this.rebuildUnifiedState();
  }

  /*
   * Existing Project / Task read action.
   */
  async markAsRead(
    notificationId: number,
  ): Promise<void> {
    const response = await firstValueFrom(
      this.http.patch<ReadNotificationResponse>(
        `${environment.apiUrl}/notifications/${notificationId}/read`,
        {},
      ),
    );

    this.replaceNotification(
      response.data.notification,
    );

    this.projectUnreadCount =
      response.data.unread_count;

    this.rebuildUnifiedState();
  }

  /*
   * VPN alert read action.
   */
  async markVpnAlertAsRead(
    alertId: number,
  ): Promise<void> {
    if (!this.isVpnAdmin()) {
      return;
    }

    const response = await firstValueFrom(
      this.http.patch<ReadVpnUsageAlertResponse>(
        `${environment.apiUrl}/vpn/usage/alerts/${alertId}/read`,
        {},
      ),
    );

    this.vpnAlertsSubject.next(
      this.vpnAlertsSubject.value.map(
        (alert) => {
          if (alert.id !== alertId) {
            return alert;
          }

          return {
            ...alert,
            is_read: true,
            read_at:
              alert.read_at ??
              new Date().toISOString(),
          };
        },
      ),
    );

    this.vpnUnreadCount =
      response.data.unread_count;

    this.rebuildUnifiedState();
  }

  /*
   * Mark all project notifications
   * and VPN alerts as read.
   */
  async markAllAsRead(): Promise<void> {
    const response = await firstValueFrom(
      this.http.patch<ReadAllNotificationsResponse>(
        `${environment.apiUrl}/notifications/read-all`,
        {},
      ),
    );

    this.notificationsSubject.next(
      this.notificationsSubject.value.map(
        (notification) => ({
          ...notification,

          notification: {
            ...notification.notification,
            is_read: true,
            read_at:
              notification.notification.read_at ??
              new Date().toISOString(),
          },
        }),
      ),
    );

    this.projectUnreadCount =
      response.data.unread_count;

    this.rebuildUnifiedState();

    if (!this.isVpnAdmin()) {
      return;
    }

    const vpnResponse = await firstValueFrom(
      this.http.patch<ReadVpnUsageAlertResponse>(
        `${environment.apiUrl}/vpn/usage/alerts/read-all`,
        {},
      ),
    );

    this.vpnAlertsSubject.next(
      this.vpnAlertsSubject.value.map(
        (alert) => ({
          ...alert,
          is_read: true,
          read_at:
            alert.read_at ??
            new Date().toISOString(),
        }),
      ),
    );

    this.vpnUnreadCount =
      vpnResponse.data.unread_count;

    this.rebuildUnifiedState();
  }

  reset(): void {
    this.sessionVersion++;

    this.notificationsSubject.next([]);
    this.vpnAlertsSubject.next([]);
    this.notificationItemsSubject.next([]);

    this.projectUnreadCount = 0;
    this.vpnUnreadCount = 0;

    this.unreadCountSubject.next(0);
    this.loadingSubject.next(false);
    this.initializedSubject.next(false);
  }

  /*
   * Merge both notification sources.
   *
   * Prefixed keys avoid ID collisions
   * between separate database tables.
   */
  private rebuildUnifiedState(): void {
    const projectItems: NotificationItem[] =
      this.notificationsSubject.value.map(
        (activity) => ({
          kind: 'project',
          key:
            `project:${activity.notification.id}`,
          created_at: activity.created_at,
          is_read:
          activity.notification.is_read,
          activity,
        }),
      );

    const vpnItems: NotificationItem[] =
      this.vpnAlertsSubject.value.map(
        (alert) => ({
          kind: 'vpn',
          key: `vpn:${alert.id}`,
          created_at: alert.created_at,
          is_read: alert.is_read,
          alert,
        }),
      );

    const uniqueItems = new Map<
      string,
      NotificationItem
    >();

    for (
      const item of [
      ...projectItems,
      ...vpnItems,
    ]
      ) {
      uniqueItems.set(
        item.key,
        item,
      );
    }

    const items = Array.from(
      uniqueItems.values(),
    ).sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    );

    this.notificationItemsSubject.next(
      items,
    );

    this.unreadCountSubject.next(
      this.projectUnreadCount +
      this.vpnUnreadCount,
    );
  }

  private isVpnAdmin(): boolean {
    const user =
      this.authService.getCurrentUser();

    return (
      user?.email?.trim().toLowerCase() ===
      this.vpnAdminEmail
    );
  }

  /*
   * Preserve existing Reverb events
   * for Task and Project notifications.
   */
  private listenToRealtime(): void {
    this.realtimeService
      .notificationCreated$
      .subscribe((event) => {
        const current =
          this.notificationsSubject.value;

        const alreadyExists =
          current.some(
            (notification) =>
              notification.notification.id ===
              event.notification.notification.id,
          );

        if (!alreadyExists) {
          this.notificationsSubject.next([
            event.notification,
            ...current,
          ]);
        }

        this.projectUnreadCount =
          event.unread_count;

        this.rebuildUnifiedState();
      });

    this.realtimeService
      .notificationsReadUpdated$
      .subscribe((event) => {
        if (event.read_all) {
          this.notificationsSubject.next(
            this.notificationsSubject.value.map(
              (notification) => ({
                ...notification,

                notification: {
                  ...notification.notification,
                  is_read: true,
                  read_at:
                    notification.notification.read_at ??
                    new Date().toISOString(),
                },
              }),
            ),
          );
        } else if (
          event.notification_id !== null
        ) {
          this.notificationsSubject.next(
            this.notificationsSubject.value.map(
              (notification) => {
                if (
                  notification.notification.id !==
                  event.notification_id
                ) {
                  return notification;
                }

                return {
                  ...notification,

                  notification: {
                    ...notification.notification,
                    is_read: true,
                    read_at:
                      notification.notification.read_at ??
                      new Date().toISOString(),
                  },
                };
              },
            ),
          );
        }

        this.projectUnreadCount =
          event.unread_count;

        this.rebuildUnifiedState();
      });
  }

  private replaceNotification(
    updatedNotification: ActivityNotification,
  ): void {
    this.notificationsSubject.next(
      this.notificationsSubject.value.map(
        (notification) =>
          notification.notification.id ===
          updatedNotification.notification.id
            ? updatedNotification
            : notification,
      ),
    );
  }
}
