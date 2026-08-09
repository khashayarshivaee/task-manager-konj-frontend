import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  firstValueFrom,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import { RealtimeService } from '../../core/services/realtime.service';

import {
  ActivityNotification,
  ListNotificationsResponse,
  ReadAllNotificationsResponse,
  ReadNotificationResponse,
  UnreadNotificationCountResponse,
} from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http =
    inject(HttpClient);

  private readonly realtimeService =
    inject(RealtimeService);

  private readonly notificationsSubject =
    new BehaviorSubject<
      ActivityNotification[]
    >([]);

  private readonly unreadCountSubject =
    new BehaviorSubject<number>(0);

  private readonly loadingSubject =
    new BehaviorSubject<boolean>(false);

  private readonly initializedSubject =
    new BehaviorSubject<boolean>(false);

  readonly notifications$ =
    this.notificationsSubject
      .asObservable();

  readonly unreadCount$ =
    this.unreadCountSubject
      .asObservable();

  readonly loading$ =
    this.loadingSubject
      .asObservable();

  readonly initialized$ =
    this.initializedSubject
      .asObservable();

  constructor() {
    this.listenToRealtime();
  }

  async initialize(): Promise<void> {
    if (
      this.initializedSubject.value
      || this.loadingSubject.value
    ) {
      return;
    }

    this.loadingSubject.next(true);

    try {
      const response =
        await firstValueFrom(
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

      this.notificationsSubject.next(
        response.data.notifications,
      );

      this.unreadCountSubject.next(
        response.data.unread_count,
      );

      this.initializedSubject.next(
        true,
      );
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async refreshUnreadCount(): Promise<void> {
    const response =
      await firstValueFrom(
        this.http.get<UnreadNotificationCountResponse>(
          `${environment.apiUrl}/notifications/unread-count`,
        ),
      );

    this.unreadCountSubject.next(
      response.data.unread_count,
    );
  }

  async markAsRead(
    notificationId: number,
  ): Promise<void> {
    const response =
      await firstValueFrom(
        this.http.patch<ReadNotificationResponse>(
          `${environment.apiUrl}/notifications/${notificationId}/read`,
          {},
        ),
      );

    this.replaceNotification(
      response.data.notification,
    );

    this.unreadCountSubject.next(
      response.data.unread_count,
    );
  }

  async markAllAsRead(): Promise<void> {
    const response =
      await firstValueFrom(
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
              notification.notification.read_at
              ?? new Date().toISOString(),
          },
        }),
      ),
    );

    this.unreadCountSubject.next(
      response.data.unread_count,
    );
  }

  reset(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.loadingSubject.next(false);
    this.initializedSubject.next(false);
  }

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
              event.notification
                .notification.id,
          );

        if (!alreadyExists) {
          this.notificationsSubject.next([
            event.notification,
            ...current,
          ]);
        }

        this.unreadCountSubject.next(
          event.unread_count,
        );
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
                    notification.notification
                      .read_at
                    ?? new Date().toISOString(),
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
                      notification.notification
                        .read_at
                      ?? new Date().toISOString(),
                  },
                };
              },
            ),
          );
        }

        this.unreadCountSubject.next(
          event.unread_count,
        );
      });
  }

  private replaceNotification(
    updatedNotification:
      ActivityNotification,
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
