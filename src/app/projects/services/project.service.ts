import {
  HttpClient,
} from '@angular/common/http';
import {
  inject,
  Injectable,
} from '@angular/core';
import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';
import {
  CreateProjectPayload,
  CreateProjectResponse,
  GetProjectResponse,
  ListProjectsResponse,
  UpdateProjectPayload,
  UpdateProjectResponse,
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

  getProject(
    workspaceId: number,
    projectId: number,
  ): Observable<GetProjectResponse> {
    return this.http.get<GetProjectResponse>(
      `${this.workspacesUrl}/${workspaceId}/projects/${projectId}`,
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

  updateProject(
    workspaceId: number,
    projectId: number,
    payload: UpdateProjectPayload,
  ): Observable<UpdateProjectResponse> {
    return this.http.put<UpdateProjectResponse>(
      `${this.workspacesUrl}/${workspaceId}/projects/${projectId}`,
      payload,
    );
  }
}
