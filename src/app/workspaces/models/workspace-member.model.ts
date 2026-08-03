import {
  WorkspaceRole,
} from './workspace.model';

export interface WorkspaceMemberUser {
  id: number;
  name: string;
  email: string;
  avatar_path: string | null;
  is_active: boolean;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: WorkspaceRole;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  user: WorkspaceMemberUser;
}

export type ManageableWorkspaceRole =
  | 'admin'
  | 'member';

export interface AddWorkspaceMemberPayload {
  email: string;
  role: ManageableWorkspaceRole;
}

export interface UpdateWorkspaceMemberPayload {
  role: ManageableWorkspaceRole;
}

export interface ListWorkspaceMembersResponse {
  data: {
    members: WorkspaceMember[];
  };
}

export interface WorkspaceMemberResponse {
  message: string;
  data: {
    member: WorkspaceMember;
  };
}

export interface DeleteWorkspaceMemberResponse {
  message: string;
}
