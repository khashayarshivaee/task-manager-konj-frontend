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
  DeleteWorkspacePayload,
  GetWorkspaceDashboardResponse,
  WorkspaceDashboard,
  DeleteWorkspaceResponse,
  ListWorkspacesResponse,
  UpdateWorkspacePayload,
  UpdateWorkspaceResponse,
  Workspace,
} from '../models/workspace.model';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  private readonly workspacesUrl =
    `${environment.apiUrl}/workspaces`;

  private readonly activeWorkspaceIdKey =
    'konj_task_manager_active_workspace_id';

  private readonly workspacesSubject =
    new BehaviorSubject<Workspace[]>([]);

  private readonly activeWorkspaceSubject =
    new BehaviorSubject<Workspace | null>(null);

  readonly workspaces$ =
    this.workspacesSubject.asObservable();

  readonly activeWorkspace$ =
    this.activeWorkspaceSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
  ) {}

  loadWorkspaces(): Observable<Workspace[]> {
    return this.http
      .get<ListWorkspacesResponse>(
        this.workspacesUrl,
      )
      .pipe(
        map((response) => response.data.workspaces),

        tap((workspaces) => {
          this.workspacesSubject.next(workspaces);

          const savedWorkspaceId =
            this.getSavedActiveWorkspaceId();

          const selectedWorkspace =
            workspaces.find(
              (workspace) =>
                workspace.id === savedWorkspaceId,
            ) ??
            workspaces[0] ??
            null;

          if (selectedWorkspace) {
            this.setActiveWorkspace(
              selectedWorkspace,
            );

            return;
          }

          this.clearActiveWorkspace();
        }),
      );
  }

  getDashboard(
    workspaceId: number,
  ): Observable<WorkspaceDashboard> {
    return this.http
      .get<GetWorkspaceDashboardResponse>(
        `${this.workspacesUrl}/${workspaceId}/dashboard`,
      )
      .pipe(
        map((response) => response.data),
      );
  }

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
          const currentWorkspaces =
            this.workspacesSubject.value;

          this.workspacesSubject.next([
            workspace,
            ...currentWorkspaces,
          ]);

          this.setActiveWorkspace(workspace);
        }),
      );
  }

  updateWorkspace(
    workspaceId: number,
    payload: UpdateWorkspacePayload,
  ): Observable<Workspace> {
    const requestPayload: UpdateWorkspacePayload = {
      name: payload.name.trim(),
    };

    return this.http
      .put<UpdateWorkspaceResponse>(
        `${this.workspacesUrl}/${workspaceId}`,
        requestPayload,
      )
      .pipe(
        map((response) => response.data.workspace),

        tap((updatedWorkspace) => {
          const updatedWorkspaces =
            this.workspacesSubject.value.map(
              (workspace) =>
                workspace.id === updatedWorkspace.id
                  ? updatedWorkspace
                  : workspace,
            );

          this.workspacesSubject.next(
            updatedWorkspaces,
          );

          if (
            this.activeWorkspaceSubject.value?.id ===
            updatedWorkspace.id
          ) {
            this.setActiveWorkspace(
              updatedWorkspace,
            );
          }
        }),
      );
  }

  deleteWorkspace(
    workspaceId: number,
    confirmationName: string,
  ): Observable<void> {
    const payload: DeleteWorkspacePayload = {
      confirmation_name:
        confirmationName.trim(),
    };

    return this.http
      .delete<DeleteWorkspaceResponse>(
        `${this.workspacesUrl}/${workspaceId}`,
        {
          body: payload,
        },
      )
      .pipe(
        tap(() => {
          const remainingWorkspaces =
            this.workspacesSubject.value.filter(
              (workspace) =>
                workspace.id !== workspaceId,
            );

          this.workspacesSubject.next(
            remainingWorkspaces,
          );

          const activeWorkspace =
            this.activeWorkspaceSubject.value;

          if (
            activeWorkspace?.id !== workspaceId
          ) {
            return;
          }

          const nextWorkspace =
            remainingWorkspaces[0] ?? null;

          if (nextWorkspace) {
            this.setActiveWorkspace(
              nextWorkspace,
            );

            return;
          }

          this.clearActiveWorkspace();
        }),

        map(() => undefined),
      );
  }

  getWorkspaces(): Workspace[] {
    return this.workspacesSubject.value;
  }

  getActiveWorkspace(): Workspace | null {
    return this.activeWorkspaceSubject.value;
  }

  setActiveWorkspace(
    workspace: Workspace,
  ): void {
    localStorage.setItem(
      this.activeWorkspaceIdKey,
      String(workspace.id),
    );

    this.activeWorkspaceSubject.next(workspace);
  }

  clearActiveWorkspace(): void {
    localStorage.removeItem(
      this.activeWorkspaceIdKey,
    );

    this.activeWorkspaceSubject.next(null);
  }

  resetWorkspaceState(): void {
    this.workspacesSubject.next([]);
    this.clearActiveWorkspace();
  }

  private getSavedActiveWorkspaceId(): number | null {
    const storedValue = localStorage.getItem(
      this.activeWorkspaceIdKey,
    );

    if (!storedValue) {
      return null;
    }

    const workspaceId = Number(storedValue);

    return Number.isInteger(workspaceId)
      ? workspaceId
      : null;
  }
}
