
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

export type SpeedTestDownloadSize =
  2 | 4 | 8;

export interface SpeedTestPingResponse {
  data: {
    status: string;
  };
}

export interface SpeedTestUploadResponse {
  data: {
    received_bytes: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ClientSpeedTestService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/server-status/speed-test`;

  /**
   * Measure API response latency.
   */
  ping(): Observable<SpeedTestPingResponse> {
    return this.http.get<SpeedTestPingResponse>(
      `${this.apiUrl}/ping`,
    );
  }

  /**
   * Download a test payload.
   *
   * Supported sizes:
   * 2 MiB
   * 4 MiB
   * 8 MiB
   */
  download(
    megabytes: SpeedTestDownloadSize = 2,
  ): Observable<ArrayBuffer> {

    return this.http.get(
      `${this.apiUrl}/download`,
      {
        params: {
          mb: String(megabytes),
        },

        responseType: 'arraybuffer',
      },
    );
  }

  /**
   * Upload a test payload (max 1 MiB).
   */
  upload(
    payload: Blob,
  ): Observable<SpeedTestUploadResponse> {

    return this.http.post<SpeedTestUploadResponse>(
      `${this.apiUrl}/upload`,
      payload,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      },
    );
  }
}
