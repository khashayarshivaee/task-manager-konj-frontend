import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateTaskPayload,
  CreateTaskResponse,
  DeleteTaskAttachmentResponse,
  DeleteTaskResponse,
  GetTaskResponse,
  ListTaskAttachmentsResponse,
  ListTasksResponse,
  GetTaskWatchersResponse,
  UpdateTaskWatcherResponse,
  UpdateTaskPayload,
  UpdateTaskResponse,
  UploadTaskAttachmentsResponse,
} from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly http = inject(HttpClient);

  getTasks(
    workspaceId: number,
    projectId: number,
  ): Observable<ListTasksResponse> {
    return this.http.get<ListTasksResponse>(
      this.tasksUrl(
        workspaceId,
        projectId,
      ),
    );
  }

  getTaskWatchers(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): Observable<GetTaskWatchersResponse> {
    return this.http.get<GetTaskWatchersResponse>(
      `${this.tasksUrl(
        workspaceId,
        projectId,
      )}/${taskId}/watchers`,
    );
  }

  watchTask(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): Observable<UpdateTaskWatcherResponse> {
    return this.http.post<UpdateTaskWatcherResponse>(
      `${this.tasksUrl(
        workspaceId,
        projectId,
      )}/${taskId}/watch`,
      {},
    );
  }

  unwatchTask(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): Observable<UpdateTaskWatcherResponse> {
    return this.http.delete<UpdateTaskWatcherResponse>(
      `${this.tasksUrl(
        workspaceId,
        projectId,
      )}/${taskId}/watch`,
    );
  }

  getTask(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): Observable<GetTaskResponse> {
    return this.http.get<GetTaskResponse>(
      `${this.tasksUrl(
        workspaceId,
        projectId,
      )}/${taskId}`,
    );
  }

  createTask(
    workspaceId: number,
    projectId: number,
    payload: CreateTaskPayload,
  ): Observable<CreateTaskResponse> {
    return this.http.post<CreateTaskResponse>(
      this.tasksUrl(
        workspaceId,
        projectId,
      ),
      payload,
    );
  }

  updateTask(
    workspaceId: number,
    projectId: number,
    taskId: number,
    payload: UpdateTaskPayload,
  ): Observable<UpdateTaskResponse> {
    return this.http.put<UpdateTaskResponse>(
      `${this.tasksUrl(
        workspaceId,
        projectId,
      )}/${taskId}`,
      payload,
    );
  }

  deleteTask(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): Observable<DeleteTaskResponse> {
    return this.http.delete<DeleteTaskResponse>(
      `${this.tasksUrl(
        workspaceId,
        projectId,
      )}/${taskId}`,
    );
  }

  getAttachments(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): Observable<ListTaskAttachmentsResponse> {
    return this.http.get<ListTaskAttachmentsResponse>(
      this.attachmentsUrl(
        workspaceId,
        projectId,
        taskId,
      ),
    );
  }

  uploadAttachments(
    workspaceId: number,
    projectId: number,
    taskId: number,
    files: File[],
  ): Observable<UploadTaskAttachmentsResponse> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append(
        'images[]',
        file,
        file.name,
      );
    });

    return this.http.post<UploadTaskAttachmentsResponse>(
      this.attachmentsUrl(
        workspaceId,
        projectId,
        taskId,
      ),
      formData,
    );
  }

  getAttachmentFile(
    workspaceId: number,
    projectId: number,
    taskId: number,
    attachmentId: number,
  ): Observable<Blob> {
    return this.http.get(
      `${this.attachmentsUrl(
        workspaceId,
        projectId,
        taskId,
      )}/${attachmentId}/file`,
      {
        responseType: 'blob',
      },
    );
  }

  deleteAttachment(
    workspaceId: number,
    projectId: number,
    taskId: number,
    attachmentId: number,
  ): Observable<DeleteTaskAttachmentResponse> {
    return this.http.delete<DeleteTaskAttachmentResponse>(
      `${this.attachmentsUrl(
        workspaceId,
        projectId,
        taskId,
      )}/${attachmentId}`,
    );
  }

  private tasksUrl(
    workspaceId: number,
    projectId: number,
  ): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/projects/${projectId}/tasks`;
  }

  private attachmentsUrl(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): string {
    return `${this.tasksUrl(
      workspaceId,
      projectId,
    )}/${taskId}/attachments`;
  }
}
