import {
  ProjectActivity,
  ProjectActivityPaginationMeta,
} from '../../projects/models/project-activity.model';

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
