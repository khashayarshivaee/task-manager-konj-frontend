import {
  inject,
  Injectable,
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
import {
  CreateProjectPayload,
  CreateProjectResponse,
  ListProjectsResponse,
} from '../models/project.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly http = inject(HttpClient);

  private readonly workspacesUrl =
    `${environment.apiUrl}/workspaces`;

  getProjects(
    workspaceId: number,
  ): Observable<ListProjectsResponse> {
    return this.http.get<ListProjectsResponse>(
      `${this.workspacesUrl}/${workspaceId}/projects`,
    );
  }

  createProject(
    workspaceId: number,
    payload: CreateProjectPayload,
  ): Observable<CreateProjectResponse> {
    return this.http.post<CreateProjectResponse>(
      `${this.workspacesUrl}/${workspaceId}/projects`,
      payload,
    );
  }
}
