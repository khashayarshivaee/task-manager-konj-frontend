import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  map,
  tap,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateWorkspacePayload,
  CreateWorkspaceResponse,
  Workspace,
} from '../models/workspace.model';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  private readonly workspacesUrl =
    `${environment.apiUrl}/workspaces`;

  private readonly activeWorkspaceSubject =
    new BehaviorSubject<Workspace | null>(null);

  readonly activeWorkspace$ =
    this.activeWorkspaceSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
  ) {}

  createWorkspace(
    payload: CreateWorkspacePayload,
  ): Observable<Workspace> {
    const requestPayload: CreateWorkspacePayload = {
      name: payload.name.trim(),
    };

    return this.http
      .post<CreateWorkspaceResponse>(
        this.workspacesUrl,
        requestPayload,
      )
      .pipe(
        map((response) => response.data.workspace),
        tap((workspace) => {
          this.activeWorkspaceSubject.next(workspace);
        }),
      );
  }

  getActiveWorkspace(): Workspace | null {
    return this.activeWorkspaceSubject.value;
  }

  setActiveWorkspace(
    workspace: Workspace,
  ): void {
    this.activeWorkspaceSubject.next(workspace);
  }

  clearActiveWorkspace(): void {
    this.activeWorkspaceSubject.next(null);
  }
}
