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
  ServerConnectionsData,
  ServerConnectionsResponse,
} from '../models/server-connection.model';

@Injectable({
  providedIn: 'root',
})
export class ServerConnectionService {
  private readonly http =
    inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/vpn/sessions`;

  getActiveConnections():
    Observable<ServerConnectionsData> {
    return this.http
      .get<ServerConnectionsResponse>(
        this.url,
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }
}
