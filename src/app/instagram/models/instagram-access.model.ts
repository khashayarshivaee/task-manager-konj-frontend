export interface InstagramAccessUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  instagram_access: boolean;
  can_manage_access: boolean;
}

export interface InstagramAccessListResponse {
  workspace_id: number;
  users: InstagramAccessUser[];
}

export interface InstagramAccessUpdateResponse {
  message: string;
  user_id: number;
  instagram_access: boolean;
}
