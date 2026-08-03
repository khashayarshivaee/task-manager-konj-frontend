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
  AddWorkspaceMemberPayload,
  DeleteWorkspaceMemberResponse,
  ListWorkspaceMembersResponse,
  ManageableWorkspaceRole,
  UpdateWorkspaceMemberPayload,
  WorkspaceMember,
  WorkspaceMemberResponse,
} from '../models/workspace-member.model';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceMemberService {
  private readonly workspacesUrl =
    `${environment.apiUrl}/workspaces`;

  constructor(
    private readonly http: HttpClient,
  ) {}

  getMembers(
    workspaceId: number,
  ): Observable<WorkspaceMember[]> {
    return this.http
      .get<ListWorkspaceMembersResponse>(
        this.getMembersUrl(workspaceId),
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
    payload: AddWorkspaceMemberPayload,
  ): Observable<WorkspaceMember> {
    const requestPayload: AddWorkspaceMemberPayload = {
      email: payload.email
        .trim()
        .toLowerCase(),

      role: payload.role,
    };

    return this.http
      .post<WorkspaceMemberResponse>(
        this.getMembersUrl(workspaceId),
        requestPayload,
      )
      .pipe(
        map(
          (response) =>
            response.data.member,
        ),
      );
  }

  updateMemberRole(
    workspaceId: number,
    membershipId: number,
    role: ManageableWorkspaceRole,
  ): Observable<WorkspaceMember> {
    const payload: UpdateWorkspaceMemberPayload = {
      role,
    };

    return this.http
      .put<WorkspaceMemberResponse>(
        `${this.getMembersUrl(workspaceId)}/${membershipId}`,
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
    membershipId: number,
  ): Observable<void> {
    return this.http
      .delete<DeleteWorkspaceMemberResponse>(
        `${this.getMembersUrl(workspaceId)}/${membershipId}`,
      )
      .pipe(
        map(() => undefined),
      );
  }

  private getMembersUrl(
    workspaceId: number,
  ): string {
    return `${this.workspacesUrl}/${workspaceId}/members`;
  }
}
