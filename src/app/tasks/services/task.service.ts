import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateTaskPayload,
  CreateTaskResponse,
  ProjectTaskCalendarResponse,
  ProjectTaskPeriod,
  ProjectTaskSummaryResponse,
  TaskListQuery,
  DeleteTaskAttachmentResponse,
  DeleteTaskResponse,
  UpdateTaskStatusPayload,
  UpdateTaskStatusResponse,
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


  getWorkspaceTasks(
    workspaceId: number,
    query: TaskListQuery = {},
  ): Observable<ListTasksResponse> {
    let params = new HttpParams();

    if (query.page !== undefined) {
      params = params.set(
        'page',
        String(query.page),
      );
    }

    if (query.per_page !== undefined) {
      params = params.set(
        'per_page',
        String(query.per_page),
      );
    }

    if (query.search) {
      params = params.set(
        'search',
        query.search,
      );
    }

    if (query.status) {
      params = params.set(
        'status',
        query.status,
      );
    }

    if (query.priority) {
      params = params.set(
        'priority',
        query.priority,
      );
    }

    if (query.assignee !== undefined) {
      params = params.set(
        'assignee',
        String(query.assignee),
      );
    }

    if (query.due) {
      params = params.set(
        'due',
        query.due,
      );
    }

    if (query.sort) {
      params = params.set(
        'sort',
        query.sort,
      );
    }

    if (query.direction) {
      params = params.set(
        'direction',
        query.direction,
      );
    }

    return this.http.get<ListTasksResponse>(
      `${environment.apiUrl}/workspaces/${workspaceId}/tasks`,
      {
        params,
      },
    );
  }
  getTasks(
    workspaceId: number,
    projectId: number,
    query: TaskListQuery = {},
  ): Observable<ListTasksResponse> {
    let params = new HttpParams();

    if (query.page !== undefined) {
      params = params.set(
        'page',
        String(query.page),
      );
    }

    if (query.per_page !== undefined) {
      params = params.set(
        'per_page',
        String(query.per_page),
      );
    }

    if (query.search) {
      params = params.set(
        'search',
        query.search,
      );
    }

    if (query.status) {
      params = params.set(
        'status',
        query.status,
      );
    }

    if (query.priority) {
      params = params.set(
        'priority',
        query.priority,
      );
    }

    if (query.assignee !== undefined) {
      params = params.set(
        'assignee',
        String(query.assignee),
      );
    }

    if (query.due) {
      params = params.set(
        'due',
        query.due,
      );
    }

    if (query.sort) {
      params = params.set(
        'sort',
        query.sort,
      );
    }

    if (query.direction) {
      params = params.set(
        'direction',
        query.direction,
      );
    }

    return this.http.get<ListTasksResponse>(
      this.tasksUrl(
        workspaceId,
        projectId,
      ),
      {
        params,
      },
    );
  }

  getTaskSummary(
    workspaceId: number,
    projectId: number,
    period: ProjectTaskPeriod = 'all',
  ): Observable<ProjectTaskSummaryResponse> {
    const params = new HttpParams().set(
      'period',
      period,
    );

    return this.http.get<ProjectTaskSummaryResponse>(
      this.taskSummaryUrl(
        workspaceId,
        projectId,
      ),
      {
        params,
      },
    );
  }
  getTaskCalendar(
    workspaceId: number,
    projectId: number,
    from: string,
    to: string,
  ): Observable<ProjectTaskCalendarResponse> {
    const params = new HttpParams()
      .set(
        'from',
        from,
      )
      .set(
        'to',
        to,
      );

    return this.http.get<ProjectTaskCalendarResponse>(
      `${this.tasksUrl(
        workspaceId,
        projectId,
      )}/calendar`,
      {
        params,
      },
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

  updateTaskStatus(
    workspaceId: number,
    projectId: number,
    taskId: number,
    payload: UpdateTaskStatusPayload,
  ): Observable<UpdateTaskStatusResponse> {
    return this.http.patch<UpdateTaskStatusResponse>(
      `${this.tasksUrl(
        workspaceId,
        projectId,
      )}/${taskId}/status`,
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

  private taskSummaryUrl(
    workspaceId: number,
    projectId: number,
  ): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/projects/${projectId}/task-summary`;
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
