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

export interface ServerHealthResult {
  cpu_percent: number;

  memory_total_bytes: number;
  memory_used_bytes: number;
  memory_percent: number;

  disk_total_bytes: number;
  disk_used_bytes: number;
  disk_percent: number;

  uptime_seconds: number;

  measured_at: string;
}

export interface ServerHealthResponse {
  status: 'pending' | 'completed';

  data: ServerHealthResult | null;

  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ServerHealthService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/server-status/health`;

  /**
   * Read the latest cached server health data.
   *
   * Available to all authenticated
   * and verified Task Manager users.
   */
  getLatest(): Observable<ServerHealthResponse> {

    return this.http.get<ServerHealthResponse>(
      this.apiUrl,
    );

  }
}
