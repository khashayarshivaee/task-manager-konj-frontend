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

export type ServerHistoryRange =
  | '24h'
  | '7d'
  | '30d';

export interface ServerHistoryPoint {
  time: string;

  cpu_avg: number;
  cpu_max: number;

  memory_avg: number;
  disk_avg: number;
}

export interface ServerHistorySummary {
  peak_cpu_percent: number | null;
  peak_cpu_at: string | null;
}

export interface ServerPerformanceHistoryResponse {
  status: 'pending' | 'completed';

  server: {
    id: number;
    slug: string;
    name: string;
  };

  range: ServerHistoryRange;

  interval_seconds: number;
  sample_count: number;

  summary: ServerHistorySummary;

  data: ServerHistoryPoint[];
}

@Injectable({
  providedIn: 'root',
})
export class ServerPerformanceHistoryService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/server-status/servers`;

  getHistory(
    serverSlug: string,
    range: ServerHistoryRange = '24h',
  ): Observable<ServerPerformanceHistoryResponse> {

    const url =
      `${this.apiUrl}/${encodeURIComponent(serverSlug)}/history`;

    return this.http.get<ServerPerformanceHistoryResponse>(
      url,
      {
        params: {
          range,
        },
      },
    );
  }
}
