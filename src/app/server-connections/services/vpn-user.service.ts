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

import {
  VpnUserDestination,
  VpnUserDestinationsResponse,
  CreateVpnUserRequest,
  CreateVpnUserResponse,
  VpnUser,
  VpnUsersResponse,
  VpnUserStateResponse,
} from '../models/vpn-user.model';

@Injectable({
  providedIn: 'root',
})
export class VpnUserService {
  private readonly http =
    inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/vpn/users`;

  getUsers(): Observable<VpnUser[]> {
    return this.http
      .get<VpnUsersResponse>(
        this.url,
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }

  createUser(
    request: CreateVpnUserRequest,
  ): Observable<CreateVpnUserResponse['data']> {
    return this.http
      .post<CreateVpnUserResponse>(
        this.url,
        request,
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }

  revokeUser(
    vpnUserId: number,
  ): Observable<VpnUserStateResponse['data']> {
    return this.http
      .delete<VpnUserStateResponse>(
        `${this.url}/${vpnUserId}`,
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }

  enableUser(
    vpnUserId: number,
  ): Observable<VpnUserStateResponse['data']> {
    return this.http
      .post<VpnUserStateResponse>(
        `${this.url}/${vpnUserId}/enable`,
        {},
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }

  getDestinations(
    vpnUserId: number,
  ): Observable<VpnUserDestination[]> {
    return this.http
      .get<VpnUserDestinationsResponse>(
        `${environment.apiUrl}/vpn/users/${vpnUserId}/destinations`,
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }
}
