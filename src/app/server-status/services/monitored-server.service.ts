import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  ServerHealthResult,
} from './server-health.service';

import {
  ServerServicesStatusResult,
} from './server-services-status.service';

export interface MonitoredServer {
  id: number;
  slug: string;
  name: string;
  region: string | null;
}

export interface MonitoredServersResponse {
  data: MonitoredServer[];
}

export interface MonitoredServerDataResponse<T> {
  status: 'completed' | 'pending';
  server: MonitoredServer;
  data: T | null;
  message?: string;
}

export interface MonitoredServerRefreshResponse {
  status: 'completed';
  server: MonitoredServer;
  health: ServerHealthResult;
  services: ServerServicesStatusResult;
}

@Injectable({
  providedIn: 'root',
})
export class MonitoredServerService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/server-status/servers`;

  getServers(): Observable<MonitoredServersResponse> {
    return this.http.get<MonitoredServersResponse>(
      this.apiUrl,
    );
  }

  getHealth(
    slug: string,
  ): Observable<MonitoredServerDataResponse<ServerHealthResult>> {
    return this.http.get<
      MonitoredServerDataResponse<ServerHealthResult>
    >(
      `${this.apiUrl}/${encodeURIComponent(slug)}/health`,
    );
  }

  getServices(
    slug: string,
  ): Observable<MonitoredServerDataResponse<ServerServicesStatusResult>> {
    return this.http.get<
      MonitoredServerDataResponse<ServerServicesStatusResult>
    >(
      `${this.apiUrl}/${encodeURIComponent(slug)}/services`,
    );
  }

  refresh(
    slug: string,
  ): Observable<MonitoredServerRefreshResponse> {
    return this.http.post<MonitoredServerRefreshResponse>(
      `${this.apiUrl}/${encodeURIComponent(slug)}/refresh`,
      {},
    );
  }
}
