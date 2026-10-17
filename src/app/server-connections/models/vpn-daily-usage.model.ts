
export type VpnDailyUsagePeriod =
  | 'today'
  | 'yesterday'
  | 'last7days';

export interface VpnDailyUsageDay {
  date: string;

  downlink_bytes: number;
  uplink_bytes: number;
  total_bytes: number;
}

export interface VpnDailyUsageUser {
  id: number;
  name: string;

  downlink_bytes: number;
  uplink_bytes: number;
  total_bytes: number;

  days: VpnDailyUsageDay[];
}

export interface VpnDailyUsageData {
  period: VpnDailyUsagePeriod;
  timezone: string;

  from_date: string;
  to_date: string;

  users: VpnDailyUsageUser[];
}

export interface VpnDailyUsageResponse {
  data: VpnDailyUsageData;
}
