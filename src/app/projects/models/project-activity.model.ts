export type ProjectActivityType =
  | 'project_created'
  | 'project_updated'
  | 'project_member_added'
  | 'project_member_removed'
  | 'task_created'
  | 'task_updated'
  | 'task_status_changed'
  | 'task_assignees_changed'
  | 'task_deleted'
  | 'comment_created'
  | 'comment_updated'
  | 'comment_deleted'
  | 'task_attachment_added'
  | 'task_attachment_removed'
  | 'comment_attachment_added'
  | 'comment_attachment_removed';

export type ProjectActivitySubjectType =
  | 'project'
  | 'project_member'
  | 'task'
  | 'comment'
  | 'task_attachment'
  | 'comment_attachment';

export interface ProjectActivityActor {
  id: number;
  name: string;
  email: string;
  avatar_path: string | null;
}

export interface ProjectActivity {
  id: number;
  project_id: number;

  type: ProjectActivityType;

  subject_type:
    ProjectActivitySubjectType | null;

  subject_id: number | null;

  subject_label: string | null;

  metadata:
    Record<string, unknown> | null;

  created_at: string;

  actor: ProjectActivityActor | null;
}

export interface ProjectActivityPaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  has_more_pages: boolean;
}

export interface ListProjectActivitiesResponse {
  data: {
    activities: ProjectActivity[];
  };

  meta: ProjectActivityPaginationMeta;
}
