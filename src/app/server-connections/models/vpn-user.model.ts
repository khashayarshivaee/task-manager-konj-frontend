export interface VpnUserStats {
  uplink_bytes: number;
  downlink_bytes: number;
  total_bytes: number;
}

export interface VpnConnectionData {
  server: string;
  port: number;

  uuid: string;
  flow: string;

  security: 'reality';
  network: 'tcp';

  server_name: string;
  fingerprint: string;

  public_key: string;
  short_id: string;

  url: string;
}

export interface VpnUser {
  id: number;

  name: string;
  uuid: string;
  xray_email: string;

  is_active: boolean;

  online_available: boolean;
  is_online: boolean;
  online_sessions: number;

  flow: string;

  stats_available: boolean;

  stats: VpnUserStats;

  connection_available: boolean;
  connection: VpnConnectionData | null;

  revoked_at: string | null;
  created_at: string | null;
}

export interface VpnUsersResponse {
  data: VpnUser[];
}

export interface CreateVpnUserRequest {
  name: string;
}

export interface CreateVpnUserResponse {
  data: VpnUser;
}

export interface VpnUserStateResponse {
  data: {
    id: number;
    name: string;

    is_active: boolean;

    is_online: boolean;
    online_sessions: number;

    revoked_at: string | null;
  };
}

export interface VpnUserDestination {
  id: number;

  destination: string;

  connection_count: number;
  total_duration_seconds: number;

  first_seen_at: string | null;
  last_seen_at: string | null;

  uplink_bytes: number;
  downlink_bytes: number;
  total_bytes: number;
}

export interface VpnUserDestinationsResponse {
  data: VpnUserDestination[];
}
