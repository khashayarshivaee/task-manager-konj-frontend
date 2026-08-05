import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import {
  firstValueFrom,
  Subject,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import { TaskComment } from '../../tasks/models/task-comment.model';

interface BroadcastAuthorizationResponse {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
}

export interface TaskCommentCreatedEvent {
  workspace_id: number;
  project_id: number;
  task_id: number;
  actor_id: number;
  comment: TaskComment;
}

export interface TaskCommentUpdatedEvent {
  workspace_id: number;
  project_id: number;
  task_id: number;
  actor_id: number;
  comment: TaskComment;
}

export interface TaskCommentDeletedEvent {
  workspace_id: number;
  project_id: number;
  task_id: number;
  actor_id: number;
  comment_id: number;
  parent_id: number | null;
}

export interface TaskCommentsReadEvent {
  workspace_id: number;
  project_id: number;
  task_id: number;
  user_id: number;
  last_read_comment_id: number | null;
  unread_comments_count: number;
}

export interface TaskUnreadCommentsUpdatedEvent {
  workspace_id: number;
  project_id: number;
  task_id: number;
  user_id: number;
  unread_comments_count: number;
  reason:
    | 'comment_created'
    | 'comment_deleted'
    | 'comments_read'
    | string;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private echo: Echo<'reverb'> | null =
    null;

  private connectedUserId:
    | number
    | null = null;

  private userChannelName:
    | string
    | null = null;

  private taskChannelName:
    | string
    | null = null;

  private readonly commentCreatedSubject =
    new Subject<TaskCommentCreatedEvent>();

  private readonly commentUpdatedSubject =
    new Subject<TaskCommentUpdatedEvent>();

  private readonly commentDeletedSubject =
    new Subject<TaskCommentDeletedEvent>();

  private readonly commentsReadSubject =
    new Subject<TaskCommentsReadEvent>();

  private readonly unreadCommentsUpdatedSubject =
    new Subject<TaskUnreadCommentsUpdatedEvent>();

  readonly commentCreated$ =
    this.commentCreatedSubject.asObservable();

  readonly commentUpdated$ =
    this.commentUpdatedSubject.asObservable();

  readonly commentDeleted$ =
    this.commentDeletedSubject.asObservable();

  readonly commentsRead$ =
    this.commentsReadSubject.asObservable();

  readonly unreadCommentsUpdated$ =
    this.unreadCommentsUpdatedSubject
      .asObservable();

  constructor(
    private readonly http: HttpClient,
  ) {
    (
      window as unknown as {
        Pusher: typeof Pusher;
      }
    ).Pusher = Pusher;
  }

  connect(userId: number): void {
    if (
      this.echo &&
      this.connectedUserId === userId
    ) {
      return;
    }

    this.disconnect();

    this.echo = new Echo<'reverb'>({
      broadcaster: 'reverb',

      key: environment.reverb.key,

      wsHost: environment.reverb.host,
      wsPort: environment.reverb.wsPort,
      wssPort:
      environment.reverb.wssPort,

      forceTLS:
      environment.reverb.forceTLS,

      enabledTransports: [
        'ws',
        'wss',
      ],

      disableStats: true,

      authorizer: (channel) => {
        return {
          authorize: (
            socketId,
            callback,
          ): void => {
            firstValueFrom(
              this.http.post<BroadcastAuthorizationResponse>(
                `${environment.apiUrl}/broadcasting/auth`,
                {
                  socket_id: socketId,
                  channel_name:
                  channel.name,
                },
              ),
            )
              .then((response) => {
                callback(
                  null,
                  response,
                );
              })
              .catch(
                (error: unknown) => {
                  const authorizationError =
                    error instanceof Error
                      ? error
                      : new Error(
                        'Broadcast authorization failed.',
                      );

                  callback(
                    authorizationError,
                    null as never,
                  );
                },
              );
          },
        };
      },
    });

    this.connectedUserId = userId;
    this.userChannelName =
      `users.${userId}`;

    const userChannel =
      this.echo.private(
        this.userChannelName,
      );

    userChannel
      .listen(
        '.task.comments.read',
        (
          payload:
            TaskCommentsReadEvent,
        ) => {
          this.commentsReadSubject.next(
            payload,
          );
        },
      )
      .listen(
        '.task.unread-comments.updated',
        (
          payload:
            TaskUnreadCommentsUpdatedEvent,
        ) => {
          this.unreadCommentsUpdatedSubject
            .next(payload);
        },
      )
      .subscribed(() => {
        console.info(
          `[Realtime] Subscribed to private-${this.userChannelName}`,
        );
      })
      .error((error: unknown) => {
        console.error(
          '[Realtime] User channel subscription failed.',
          error,
        );
      });
  }

  joinTask(taskId: number): void {
    if (!this.echo) {
      console.warn(
        '[Realtime] Cannot join task channel before connecting.',
      );

      return;
    }

    const channelName =
      `tasks.${taskId}`;

    if (
      this.taskChannelName ===
      channelName
    ) {
      return;
    }

    this.leaveTask();

    this.taskChannelName =
      channelName;

    const taskChannel =
      this.echo.private(
        channelName,
      );

    taskChannel
      .listen(
        '.task.comment.created',
        (
          payload:
            TaskCommentCreatedEvent,
        ) => {
          this.commentCreatedSubject.next(
            payload,
          );
        },
      )
      .listen(
        '.task.comment.updated',
        (
          payload:
            TaskCommentUpdatedEvent,
        ) => {
          this.commentUpdatedSubject.next(
            payload,
          );
        },
      )
      .listen(
        '.task.comment.deleted',
        (
          payload:
            TaskCommentDeletedEvent,
        ) => {
          this.commentDeletedSubject.next(
            payload,
          );
        },
      )
      .subscribed(() => {
        console.info(
          `[Realtime] Subscribed to private-${channelName}`,
        );
      })
      .error((error: unknown) => {
        console.error(
          '[Realtime] Task channel subscription failed.',
          error,
        );
      });
  }

  leaveTask(): void {
    if (
      this.echo &&
      this.taskChannelName
    ) {
      this.echo.leave(
        this.taskChannelName,
      );
    }

    this.taskChannelName = null;
  }

  disconnect(): void {
    if (!this.echo) {
      this.connectedUserId = null;
      this.userChannelName = null;
      this.taskChannelName = null;

      return;
    }

    this.leaveTask();

    if (this.userChannelName) {
      this.echo.leave(
        this.userChannelName,
      );
    }

    this.echo.disconnect();

    this.echo = null;
    this.connectedUserId = null;
    this.userChannelName = null;
    this.taskChannelName = null;
  }

  getSocketId():
    | string
    | undefined {
    return this.echo?.socketId();
  }
}
