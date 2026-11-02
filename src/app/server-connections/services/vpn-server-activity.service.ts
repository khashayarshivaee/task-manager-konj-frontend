
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
  VpnServerActivityData,
  VpnServerActivityResponse,
} from '../models/vpn-server-activity.model';

@Injectable({
  providedIn: 'root',
})
export class VpnServerActivityService {

  private readonly http =
    inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/vpn/server-activity`;

  getActivity(): Observable<VpnServerActivityData> {
    return this.http
      .get<VpnServerActivityResponse>(
        this.url,
      )
      .pipe(
        map(
          (response) => response.data,
        ),
      );
  }
}
