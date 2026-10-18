
import {
  HttpClient,
} from '@angular/common/http';

import {
  Injectable,
  inject,
} from '@angular/core';

import {
  Observable,
  map,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';


export interface VpnTelegramConnection {
  connected: boolean;

  username: string | null;

  connected_at: string | null;
}


export interface VpnTelegramConnectionData {
  vpn_user_id: number;

  vpn_user_name: string;

  telegram: VpnTelegramConnection;
}


export interface VpnTelegramLinkData {
  vpn_user_id: number;

  vpn_user_name: string;

  bot_username: string;

  link: string;

  expires_at: string;
}


export interface VpnTelegramDisconnectData {
  vpn_user_id: number;

  telegram: {
    connected: boolean;
  };
}


interface VpnTelegramConnectionResponse {
  data: VpnTelegramConnectionData;
}


interface VpnTelegramLinkResponse {
  data: VpnTelegramLinkData;
}


interface VpnTelegramDisconnectResponse {
  message: string;

  data: VpnTelegramDisconnectData;
}


@Injectable({
  providedIn: 'root',
})
export class VpnTelegramService {

  private readonly http =
    inject(HttpClient);

  private readonly baseUrl =
    `${environment.apiUrl}/vpn/users`;


  /**
   * Get the current Telegram connection
   * status for a VPN user.
   */
  getConnection(
    vpnUserId: number,
  ): Observable<VpnTelegramConnectionData> {

    return this.http
      .get<VpnTelegramConnectionResponse>(
        `${this.baseUrl}/${vpnUserId}/telegram`,
      )
      .pipe(
        map(
          (response) => response.data,
        ),
      );
  }


  /**
   * Generate a secure Telegram
   * invitation link.
   *
   * The link expires after 30 minutes.
   * Generating a new link invalidates
   * the previous unused invitation.
   */
  generateLink(
    vpnUserId: number,
  ): Observable<VpnTelegramLinkData> {

    return this.http
      .post<VpnTelegramLinkResponse>(
        `${this.baseUrl}/${vpnUserId}/telegram/link`,
        {},
      )
      .pipe(
        map(
          (response) => response.data,
        ),
      );
  }


  /**
   * Disconnect Telegram notifications.
   *
   * This does not disable the VPN user
   * or modify their Xray configuration.
   */
  disconnect(
    vpnUserId: number,
  ): Observable<VpnTelegramDisconnectData> {

    return this.http
      .delete<VpnTelegramDisconnectResponse>(
        `${this.baseUrl}/${vpnUserId}/telegram`,
      )
      .pipe(
        map(
          (response) => response.data,
        ),
      );
  }
}
