export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar_path: string | null;
  role: string;
  is_active: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
  avatar?: File | null;
}

export interface UpdateProfileResponse {
  message: string;
  data: {
    user: AuthUser;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginRequestPayload extends LoginCredentials {
  device_name: string;
}

export interface AuthResponse {
  message: string;
  data: {
    user: AuthUser;
    access_token: string;
    token_type: 'Bearer';
  };
}

export interface CurrentUserResponse {
  data: {
    user: AuthUser;
  };
}

export interface LogoutResponse {
  message: string;
}
