export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'archived';

export interface ProjectCreator {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  workspace_id: number;
  created_by: number | null;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  starts_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  creator: ProjectCreator | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  starts_at?: string | null;
  due_at?: string | null;
}

export interface ListProjectsResponse {
  data: {
    projects: Project[];
  };
}

export interface CreateProjectResponse {
  message: string;
  data: {
    project: Project;
  };
}
