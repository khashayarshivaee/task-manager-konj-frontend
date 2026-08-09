import {
  HttpClient,
} from '@angular/common/http';
import {
  Injectable,
} from '@angular/core';
import {
  Observable,
  map,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';
import {
  AddProjectMemberPayload,
  ProjectMember,
  ProjectMemberResponse,
} from '../models/project-member.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectMemberService {
  private readonly workspacesUrl =
    `${environment.apiUrl}/workspaces`;

  constructor(
    private readonly http: HttpClient,
  ) {}

  getMembers(
    workspaceId: number,
    projectId: number,
  ): Observable<ProjectMember[]> {
    return this.http
      .get<{
        data: {
          members: ProjectMember[];
        };
      }>(
        this.getMembersUrl(
          workspaceId,
          projectId,
        ),
      )
      .pipe(
        map(
          (response) =>
            response.data.members,
        ),
      );
  }

  addMember(
    workspaceId: number,
    projectId: number,
    payload: AddProjectMemberPayload,
  ): Observable<ProjectMember> {
    return this.http
      .post<ProjectMemberResponse>(
        this.getMembersUrl(
          workspaceId,
          projectId,
        ),
        payload,
      )
      .pipe(
        map(
          (response) =>
            response.data.member,
        ),
      );
  }

  removeMember(
    workspaceId: number,
    projectId: number,
    membershipId: number,
  ): Observable<void> {
    return this.http
      .delete(
        `${this.getMembersUrl(
          workspaceId,
          projectId,
        )}/${membershipId}`,
      )
      .pipe(
        map(() => undefined),
      );
  }

  private getMembersUrl(
    workspaceId: number,
    projectId: number,
  ): string {
    return `${this.workspacesUrl}/${workspaceId}/projects/${projectId}/members`;
  }
}
