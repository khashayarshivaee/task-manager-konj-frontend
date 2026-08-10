import {
  HttpClient,
  HttpParams,
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
  CreateWorkspaceNotePayload,
  CreateWorkspaceNoteResponse,
  DeleteWorkspaceNoteAttachmentResponse,
  DeleteWorkspaceNoteResponse,
  GetWorkspaceNoteResponse,
  ListWorkspaceNoteAttachmentsResponse,
  ListWorkspaceNotesResponse,
  UpdateWorkspaceNotePayload,
  UpdateWorkspaceNoteResponse,
  UploadWorkspaceNoteAttachmentsResponse,
} from '../models/workspace-note.model';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceNoteService {
  private readonly http =
    inject(HttpClient);

  getNotes(
    workspaceId: number,
    search = '',
    page = 1,
    perPage = 20,
  ): Observable<ListWorkspaceNotesResponse> {
    let params =
      new HttpParams()
        .set(
          'page',
          String(page),
        )
        .set(
          'per_page',
          String(perPage),
        );

    const normalizedSearch =
      search.trim();

    if (normalizedSearch) {
      params = params.set(
        'search',
        normalizedSearch,
      );
    }

    return this.http
      .get<ListWorkspaceNotesResponse>(
        this.notesUrl(
          workspaceId,
        ),
        {
          params,
        },
      );
  }

  getNote(
    workspaceId: number,
    noteId: number,
  ): Observable<GetWorkspaceNoteResponse> {
    return this.http
      .get<GetWorkspaceNoteResponse>(
        `${this.notesUrl(
          workspaceId,
        )}/${noteId}`,
      );
  }

  createNote(
    workspaceId: number,
    payload: CreateWorkspaceNotePayload,
  ): Observable<CreateWorkspaceNoteResponse> {
    return this.http
      .post<CreateWorkspaceNoteResponse>(
        this.notesUrl(
          workspaceId,
        ),
        {
          ...payload,
          title:
            payload.title.trim(),
        },
      );
  }

  updateNote(
    workspaceId: number,
    noteId: number,
    payload: UpdateWorkspaceNotePayload,
  ): Observable<UpdateWorkspaceNoteResponse> {
    const requestPayload = {
      ...payload,

      ...(payload.title !== undefined
        ? {
          title:
            payload.title.trim(),
        }
        : {}),
    };

    return this.http
      .put<UpdateWorkspaceNoteResponse>(
        `${this.notesUrl(
          workspaceId,
        )}/${noteId}`,
        requestPayload,
      );
  }

  deleteNote(
    workspaceId: number,
    noteId: number,
  ): Observable<DeleteWorkspaceNoteResponse> {
    return this.http
      .delete<DeleteWorkspaceNoteResponse>(
        `${this.notesUrl(
          workspaceId,
        )}/${noteId}`,
      );
  }

  getAttachments(
    workspaceId: number,
    noteId: number,
  ): Observable<ListWorkspaceNoteAttachmentsResponse> {
    return this.http
      .get<ListWorkspaceNoteAttachmentsResponse>(
        this.attachmentsUrl(
          workspaceId,
          noteId,
        ),
      );
  }

  uploadAttachments(
    workspaceId: number,
    noteId: number,
    files: File[],
  ): Observable<UploadWorkspaceNoteAttachmentsResponse> {
    const formData =
      new FormData();

    files.forEach((file) => {
      formData.append(
        'images[]',
        file,
        file.name,
      );
    });

    return this.http
      .post<UploadWorkspaceNoteAttachmentsResponse>(
        this.attachmentsUrl(
          workspaceId,
          noteId,
        ),
        formData,
      );
  }

  getAttachmentFile(
    workspaceId: number,
    noteId: number,
    attachmentId: number,
  ): Observable<Blob> {
    return this.http.get(
      `${this.attachmentsUrl(
        workspaceId,
        noteId,
      )}/${attachmentId}/file`,
      {
        responseType: 'blob',
      },
    );
  }

  deleteAttachment(
    workspaceId: number,
    noteId: number,
    attachmentId: number,
  ): Observable<DeleteWorkspaceNoteAttachmentResponse> {
    return this.http
      .delete<DeleteWorkspaceNoteAttachmentResponse>(
        `${this.attachmentsUrl(
          workspaceId,
          noteId,
        )}/${attachmentId}`,
      );
  }

  private notesUrl(
    workspaceId: number,
  ): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/notes`;
  }

  private attachmentsUrl(
    workspaceId: number,
    noteId: number,
  ): string {
    return `${this.notesUrl(
      workspaceId,
    )}/${noteId}/attachments`;
  }
}
