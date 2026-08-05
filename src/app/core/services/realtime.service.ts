import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

interface BroadcastAuthorizationResponse {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
}
interface RealtimeConnectionTestPayload {
  user_id: number;
  message: string;
  sent_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private echo: Echo<'reverb'> | null = null;

  private connectedUserId: number | null = null;

  private userChannelName: string | null = null;

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
      wssPort: environment.reverb.wssPort,

      forceTLS: environment.reverb.forceTLS,

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
                  channel_name: channel.name,
                },
              ),
            )
              .then((response) => {
                callback(
                  null,
                  response,
                );
              })
              .catch((error: unknown) => {
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
              });
          },
        };
      },
    });

    this.connectedUserId = userId;
    this.userChannelName = `users.${userId}`;

    const userChannel = this.echo.private(
      this.userChannelName,
    );

    userChannel
      .listen(
        '.realtime.connection.tested',
        (
          payload:
            RealtimeConnectionTestPayload,
        ) => {
          console.info(
            '[Realtime] Test event received:',
            payload,
          );
        },
      )
      .subscribed(() => {
        console.info(
          `[Realtime] Subscribed to private-${this.userChannelName}`,
        );
      })
      .error((error: unknown) => {
        console.error(
          '[Realtime] Private channel subscription failed.',
          error,
        );
      });
  }

  disconnect(): void {
    if (!this.echo) {
      this.connectedUserId = null;
      this.userChannelName = null;

      return;
    }

    if (this.userChannelName) {
      this.echo.leave(
        this.userChannelName,
      );
    }

    this.echo.disconnect();

    this.echo = null;
    this.connectedUserId = null;
    this.userChannelName = null;
  }

  getSocketId(): string | undefined {
    return this.echo?.socketId();
  }
}
