import {
  Injectable,
  inject,
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
  CreateTaskCommentPayload,
  CreateTaskCommentResponse,
  DeleteTaskCommentAttachmentResponse,
  DeleteTaskCommentResponse,
  GetTaskCommentsResponse,
  UpdateTaskCommentPayload,
  UpdateTaskCommentResponse,
} from '../models/task-comment.model';

@Injectable({
  providedIn: 'root',
})
export class TaskCommentService {
  private readonly http =
    inject(HttpClient);

  getComments(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): Observable<GetTaskCommentsResponse> {
    return this.http.get<GetTaskCommentsResponse>(
      this.getCommentsUrl(
        workspaceId,
        projectId,
        taskId,
      ),
    );
  }

  createComment(
    workspaceId: number,
    projectId: number,
    taskId: number,
    payload: CreateTaskCommentPayload,
  ): Observable<CreateTaskCommentResponse> {
    const formData = new FormData();

    const normalizedBody =
      payload.body?.trim() ?? '';

    if (normalizedBody !== '') {
      formData.append(
        'body',
        normalizedBody,
      );
    }

    if (payload.parentId !== null) {
      formData.append(
        'parent_id',
        payload.parentId.toString(),
      );
    }

    for (const image of payload.images) {
      formData.append(
        'images[]',
        image,
        image.name,
      );
    }

    return this.http.post<CreateTaskCommentResponse>(
      this.getCommentsUrl(
        workspaceId,
        projectId,
        taskId,
      ),
      formData,
    );
  }

  updateComment(
    workspaceId: number,
    projectId: number,
    taskId: number,
    commentId: number,
    payload: UpdateTaskCommentPayload,
  ): Observable<UpdateTaskCommentResponse> {
    return this.http.put<UpdateTaskCommentResponse>(
      this.getCommentUrl(
        workspaceId,
        projectId,
        taskId,
        commentId,
      ),
      payload,
    );
  }

  deleteComment(
    workspaceId: number,
    projectId: number,
    taskId: number,
    commentId: number,
  ): Observable<DeleteTaskCommentResponse> {
    return this.http.delete<DeleteTaskCommentResponse>(
      this.getCommentUrl(
        workspaceId,
        projectId,
        taskId,
        commentId,
      ),
    );
  }

  getAttachmentFile(
    workspaceId: number,
    projectId: number,
    taskId: number,
    commentId: number,
    attachmentId: number,
  ): Observable<Blob> {
    return this.http.get(
      `${this.getCommentUrl(
        workspaceId,
        projectId,
        taskId,
        commentId,
      )}/attachments/${attachmentId}/file`,
      {
        responseType: 'blob',
      },
    );
  }

  deleteAttachment(
    workspaceId: number,
    projectId: number,
    taskId: number,
    commentId: number,
    attachmentId: number,
  ): Observable<DeleteTaskCommentAttachmentResponse> {
    return this.http.delete<DeleteTaskCommentAttachmentResponse>(
      `${this.getCommentUrl(
        workspaceId,
        projectId,
        taskId,
        commentId,
      )}/attachments/${attachmentId}`,
    );
  }

  private getCommentsUrl(
    workspaceId: number,
    projectId: number,
    taskId: number,
  ): string {
    return (
      `${environment.apiUrl}` +
      `/workspaces/${workspaceId}` +
      `/projects/${projectId}` +
      `/tasks/${taskId}` +
      '/comments'
    );
  }

  private getCommentUrl(
    workspaceId: number,
    projectId: number,
    taskId: number,
    commentId: number,
  ): string {
    return (
      this.getCommentsUrl(
        workspaceId,
        projectId,
        taskId,
      ) +
      `/${commentId}`
    );
  }
}
