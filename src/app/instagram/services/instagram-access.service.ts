import {
  HttpClient,
} from '@angular/common/http';
import {
  Injectable,
  inject,
} from '@angular/core';
import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';

import {
  InstagramAccessListResponse,
  InstagramAccessUpdateResponse,
} from '../models/instagram-access.model';

@Injectable({
  providedIn: 'root',
})
export class InstagramAccessService {
  private readonly http =
    inject(HttpClient);

  private readonly workspacesUrl =
    `${environment.apiUrl}/workspaces`;

  getUsers(
    workspaceId: number,
  ): Observable<InstagramAccessListResponse> {
    return this.http.get<InstagramAccessListResponse>(
      this.accessUrl(workspaceId),
    );
  }

  grantAccess(
    workspaceId: number,
    userId: number,
  ): Observable<InstagramAccessUpdateResponse> {
    return this.http.put<InstagramAccessUpdateResponse>(
      `${this.accessUrl(workspaceId)}/${userId}`,
      {},
    );
  }

  revokeAccess(
    workspaceId: number,
    userId: number,
  ): Observable<InstagramAccessUpdateResponse> {
    return this.http.delete<InstagramAccessUpdateResponse>(
      `${this.accessUrl(workspaceId)}/${userId}`,
    );
  }

  private accessUrl(
    workspaceId: number,
  ): string {
    return `${this.workspacesUrl}/${workspaceId}/instagram/access`;
  }
}
