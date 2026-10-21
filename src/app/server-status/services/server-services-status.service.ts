
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type ServerServiceState =
  | 'active'
  | 'down'
  | 'unknown';

export interface ServerServiceStatus {
  key: string;
  name: string;
  status: ServerServiceState;
  uptime_seconds: number | null;
}

export interface ServerServicesStatusResult {
  services: ServerServiceStatus[];
  checked_at: string | null;
}

export interface ServerServicesStatusResponse {
  status: 'completed' | 'pending';
  data: ServerServicesStatusResult | null;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ServerServicesStatusService {
  private readonly http = inject(HttpClient);

  private readonly endpoint =
    `${environment.apiUrl}/server-status/services`;

  getLatest(): Observable<ServerServicesStatusResponse> {
    return this.http.get<ServerServicesStatusResponse>(
      this.endpoint,
    );
  }
}
