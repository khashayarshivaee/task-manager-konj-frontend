export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'completed';

export type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export interface TaskUser {
  id: number;
  name: string;
  email: string;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  uploaded_by: number | null;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  updated_at: string;
  uploader: TaskUser | null;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  created_by: number | null;
  assigned_to: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  starts_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  creator: TaskUser | null;
  assignee: TaskUser | null;
  attachments?: TaskAttachment[];
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number | null;
  starts_at?: string | null;
  due_at?: string | null;
}

export interface UpdateTaskPayload {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: number | null;
  starts_at: string | null;
  due_at: string | null;
}

export interface ListTasksResponse {
  data: {
    tasks: ProjectTask[];
  };
}

export interface GetTaskResponse {
  data: {
    task: ProjectTask;
  };
}

export interface CreateTaskResponse {
  message: string;

  data: {
    task: ProjectTask;
  };
}

export interface UpdateTaskResponse {
  message: string;

  data: {
    task: ProjectTask;
  };
}

export interface DeleteTaskResponse {
  message: string;
}

export interface ListTaskAttachmentsResponse {
  data: {
    attachments: TaskAttachment[];
  };
}

export interface UploadTaskAttachmentsResponse {
  message: string;

  data: {
    attachments: TaskAttachment[];
  };
}

export interface DeleteTaskAttachmentResponse {
  message: string;
}
