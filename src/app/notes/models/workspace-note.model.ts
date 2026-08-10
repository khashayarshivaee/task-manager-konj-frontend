export interface WorkspaceNoteAuthor {
  id: number;
  name: string;
  email: string;
  avatar_path?: string | null;
}

export interface WorkspaceNoteAttachmentUploader {
  id: number;
  name: string;
  email: string;
}

export interface WorkspaceNoteAttachment {
  id: number;
  note_id: number;
  uploaded_by: number | null;

  original_name: string;
  mime_type: string;
  size: number;

  created_at: string;
  updated_at: string;

  uploader?: WorkspaceNoteAttachmentUploader | null;
}

export interface WorkspaceNote {
  id: number;
  workspace_id: number;
  author_id: number | null;

  title: string;
  content: string | null;
  is_pinned: boolean;

  created_at: string;
  updated_at: string;

  author: WorkspaceNoteAuthor | null;
  attachments: WorkspaceNoteAttachment[];
}

export interface WorkspaceNotePaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ListWorkspaceNotesResponse {
  data: {
    notes: WorkspaceNote[];
  };

  meta: WorkspaceNotePaginationMeta;
}

export interface GetWorkspaceNoteResponse {
  data: {
    note: WorkspaceNote;
  };
}

export interface CreateWorkspaceNotePayload {
  title: string;
  content?: string | null;
  is_pinned?: boolean;
}

export interface UpdateWorkspaceNotePayload {
  title?: string;
  content?: string | null;
  is_pinned?: boolean;
}

export interface CreateWorkspaceNoteResponse {
  message: string;

  data: {
    note: WorkspaceNote;
  };
}

export interface UpdateWorkspaceNoteResponse {
  message: string;

  data: {
    note: WorkspaceNote;
  };
}

export interface DeleteWorkspaceNoteResponse {
  message: string;
}

export interface ListWorkspaceNoteAttachmentsResponse {
  data: {
    attachments: WorkspaceNoteAttachment[];
  };
}

export interface UploadWorkspaceNoteAttachmentsResponse {
  message: string;

  data: {
    attachments: WorkspaceNoteAttachment[];
  };
}

export interface DeleteWorkspaceNoteAttachmentResponse {
  message: string;
}
