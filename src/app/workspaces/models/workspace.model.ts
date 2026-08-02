import { AuthUser } from '../../core/models/auth.model';

export type WorkspaceRole =
  | 'owner'
  | 'admin'
  | 'member';

export interface WorkspaceMembership {
  id: number;
  workspace_id: number;
  user_id: number;
  role: WorkspaceRole;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: number;
  owner_id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  owner: AuthUser;
  memberships: WorkspaceMembership[];
}

export interface CreateWorkspacePayload {
  name: string;
}

export interface CreateWorkspaceResponse {
  message: string;
  data: {
    workspace: Workspace;
  };
}
