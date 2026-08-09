import {
  WorkspaceMemberUser,
} from '../../workspaces/models/workspace-member.model';

export interface ProjectMemberAddedByUser {
  id: number;
  name: string;
  email: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  added_by: number | null;
  joined_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  user: WorkspaceMemberUser;
  added_by_user: ProjectMemberAddedByUser | null;
}

export interface AddProjectMemberPayload {
  user_id: number;
}

export interface ListProjectMembersResponse {
  data: {
    members: ProjectMember[];
  };
}

export interface ProjectMemberResponse {
  message: string;
  data: {
    member: ProjectMember;
  };
}

export interface DeleteProjectMemberResponse {
  message: string;
}
