export type WorkspaceRole =
  | 'owner'
  | 'admin'
  | 'member';

export interface WorkspaceOwner {
  id: number;
  name: string;
  email: string;
}

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
  owner: WorkspaceOwner;

  /**
   * Returned by GET /api/workspaces.
   */
  membership?: WorkspaceMembership;

  /**
   * Returned after creating or updating a workspace.
   */
  memberships?: WorkspaceMembership[];
}

export interface CreateWorkspacePayload {
  name: string;
}

export interface UpdateWorkspacePayload {
  name: string;
}

export interface DeleteWorkspacePayload {
  confirmation_name: string;
}

export interface CreateWorkspaceResponse {
  message: string;
  data: {
    workspace: Workspace;
  };
}

export interface UpdateWorkspaceResponse {
  message: string;
  data: {
    workspace: Workspace;
  };
}

export interface DeleteWorkspaceResponse {
  message: string;
}

export interface ListWorkspacesResponse {
  data: {
    workspaces: Workspace[];
  };
}
