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

export type ProjectTaskPeriod =
  | 'all'
  | 'this_week'
  | 'this_month'
  | 'this_year';

export type TaskDueFilter =
  | 'this_week'
  | 'this_month'
  | 'this_year'
  | 'overdue'
  | 'no_due_date';

export type TaskListSort =
  | 'workflow'
  | 'status'
  | 'priority'
  | 'due_at'
  | 'title'
  | 'created_at'
  | 'updated_at';

export type TaskSortDirection =
  | 'asc'
  | 'desc';

export interface TaskUser {
  id: number;
  name: string;
  email: string;
  avatar_path?: string | null;
}

export interface TaskProject {
  id: number;
  workspace_id: number;
  name: string;
  slug: string;
  status: string;
  color: string | null;
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
  project?: TaskProject;
  unread_comments_count: number;
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
  assignees?: TaskUser[];
  watchers?: TaskUser[];
  attachments?: TaskAttachment[];
}

export interface TaskWatcherState {
  watchers: TaskUser[];
  is_watching: boolean;
  can_comment: boolean;
  can_unwatch: boolean;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_ids?: number[];
  starts_at?: string | null;
  due_at?: string | null;
}

export interface UpdateTaskPayload {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_ids: number[];
  starts_at: string | null;
  due_at: string | null;
}
export interface TaskListQuery {
  page?: number;
  per_page?: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: number | 'me';
  due?: TaskDueFilter;
  sort?: TaskListSort;
  direction?: TaskSortDirection;
}

export interface UpdateTaskStatusPayload {
  status: TaskStatus;
}

export interface TaskPaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  has_more_pages: boolean;
}

export interface ListTasksResponse {
  data: {
    tasks: ProjectTask[];
  };

  meta: TaskPaginationMeta;
}

export interface ProjectTaskSummary {
  period: ProjectTaskPeriod;
  total: number;
  completed: number;
  remaining: number;
  completion_percentage: number;

  by_status: Record<
    TaskStatus,
    number
  >;

  without_due_date: number;
}

export interface ProjectTaskSummaryResponse {
  data: ProjectTaskSummary;
}

export interface ProjectTaskCalendarData {
  from: string;
  to: string;
  tasks: ProjectTask[];
  without_due_date: number;
}

export interface ProjectTaskCalendarResponse {
  data: ProjectTaskCalendarData;

  meta: {
    total: number;
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
export interface UpdateTaskStatusResponse {
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

export interface GetTaskWatchersResponse {
  data: TaskWatcherState;
}

export interface UpdateTaskWatcherResponse {
  message: string;
  data: TaskWatcherState;
}
