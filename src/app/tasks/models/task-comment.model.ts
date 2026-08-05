export interface TaskCommentAuthor {
  id: number;
  name: string;
  avatar_path: string | null;
}

export interface TaskCommentAttachmentUploader {
  id: number;
  name: string;
}

export interface TaskCommentAttachment {
  id: number;
  comment_id: number;
  original_name: string;
  mime_type: string;
  size: number;

  uploader:
    | TaskCommentAttachmentUploader
    | null;

  created_at: string | null;
}

export interface TaskComment {
  id: number;
  task_id: number;
  parent_id: number | null;
  body: string | null;

  is_deleted: boolean;
  is_edited: boolean;

  author: TaskCommentAuthor | null;

  attachments: TaskCommentAttachment[];
  replies: TaskComment[];

  edited_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GetTaskCommentsResponse {
  data: {
    comments: TaskComment[];
  };
}

export interface CreateTaskCommentResponse {
  message: string;

  data: {
    comment: TaskComment;
  };
}

export interface UpdateTaskCommentResponse {
  message: string;

  data: {
    comment: TaskComment;
  };
}

export interface DeleteTaskCommentResponse {
  message: string;
}

export interface DeleteTaskCommentAttachmentResponse {
  message: string;
}

export interface MarkTaskCommentsReadResponse {
  message: string;

  data: {
    last_read_comment_id:
      | number
      | null;

    unread_comments_count: number;
  };
}

export interface CreateTaskCommentPayload {
  body: string | null;
  parentId: number | null;
  images: File[];
}

export interface UpdateTaskCommentPayload {
  body: string | null;
}
