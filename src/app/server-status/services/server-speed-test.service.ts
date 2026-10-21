
import {
  Injectable,
  inject,
} from '@angular/core';

import {
  HttpClient,
} from '@angular/common/http';

import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';

export interface ServerSpeedTestResult {
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number | null;
  jitter_ms: number | null;
  server_name: string | null;
  measured_at: string;
}

export interface ServerSpeedTestResponse {
  data: ServerSpeedTestResult | null;

  status: 'completed' | 'pending';

  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ServerSpeedTestService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/server-status/server-speed-test`;

  /**
   * Read the latest server speed test result.
   *
   * This request does not execute a speed test.
   * It only reads the cached result from Laravel.
   */
  getLatest(): Observable<ServerSpeedTestResponse> {

    return this.http.get<ServerSpeedTestResponse>(
      this.apiUrl,
    );

  }
}
