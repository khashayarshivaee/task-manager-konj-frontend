
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
  VpnDailyUsageData,
  VpnDailyUsagePeriod,
  VpnDailyUsageResponse,
} from '../models/vpn-daily-usage.model';

@Injectable({
  providedIn: 'root',
})
export class VpnDailyUsageService {

  private readonly http =
    inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/vpn/usage/daily`;

  getUsage(
    period: VpnDailyUsagePeriod = 'today',
  ): Observable<VpnDailyUsageData> {

    return this.http
      .get<VpnDailyUsageResponse>(
        this.url,
        {
          params: {
            period,
          },
        },
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }
}
