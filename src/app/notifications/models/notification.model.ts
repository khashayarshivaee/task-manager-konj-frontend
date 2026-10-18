
import {
  ProjectActivity,
  ProjectActivityPaginationMeta,
} from '../../projects/models/project-activity.model';

/*
 * Existing Project / Task notifications.
 */
export interface ActivityNotification
  extends ProjectActivity {
  workspace_id: number;

  notification: {
    id: number;
    read_at: string | null;
    is_read: boolean;
  };
}

export interface ListNotificationsResponse {
  data: {
    notifications: ActivityNotification[];
    unread_count: number;
  };

  meta: ProjectActivityPaginationMeta;
}

export interface UnreadNotificationCountResponse {
  data: {
    unread_count: number;
  };
}

export interface ReadNotificationResponse {
  message: string;

  data: {
    notification: ActivityNotification;
    unread_count: number;
  };
}

export interface ReadAllNotificationsResponse {
  message: string;

  data: {
    unread_count: number;
  };
}

/*
 * VPN daily usage notifications.
 */
export interface VpnUsageAlert {
  id: number;

  vpn_user_id: number | null;
  vpn_user_name: string;

  usage_date: string;

  threshold_gb: number;
  total_bytes: number;

  read_at: string | null;
  is_read: boolean;

  created_at: string;
}

export interface ListVpnUsageAlertsResponse {
  data: {
    alerts: VpnUsageAlert[];
    unread_count: number;
  };

  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    has_more_pages: boolean;
  };
}

export interface VpnUsageAlertUnreadCountResponse {
  data: {
    unread_count: number;
  };
}

export interface ReadVpnUsageAlertResponse {
  message: string;

  data: {
    unread_count: number;
  };
}

/*
 * Unified notification model.
 *
 * Project and VPN notifications have
 * separate database IDs, so each item
 * uses a unique prefixed key.
 */
export type NotificationItem =
  | {
  kind: 'project';
  key: string;
  created_at: string;
  is_read: boolean;
  activity: ActivityNotification;
}
  | {
  kind: 'vpn';
  key: string;
  created_at: string;
  is_read: boolean;
  alert: VpnUsageAlert;
};
