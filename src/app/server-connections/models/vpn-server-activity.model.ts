
export interface VpnServerActivityTraffic {
  uplink_bytes: number;
  downlink_bytes: number;
  total_bytes: number;
}

export interface VpnServerActivityUser {
  id: number;
  name: string;

  is_active: boolean;

  has_recent_traffic: boolean;

  last_usage_recorded_at: string | null;

  today: VpnServerActivityTraffic;
}

export interface VpnServerActivitySummary {
  total_users: number;
  enabled_users: number;
  recent_traffic_users: number;

  today_uplink_bytes: number;
  today_downlink_bytes: number;
}

export interface VpnServerActivityData {
  generated_at: string;

  server: string;

  recent_window_minutes: number;

  summary: VpnServerActivitySummary;

  users: VpnServerActivityUser[];
}

export interface VpnServerActivityResponse {
  data: VpnServerActivityData;
}
