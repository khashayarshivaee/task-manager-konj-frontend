export type InstagramMediaType =
  | 'IMAGE'
  | 'VIDEO'
  | 'CAROUSEL_ALBUM'
  | 'REELS';

export type InstagramPublicationType =
  | 'image'
  | 'carousel'
  | 'reel'
  | 'story';

export type InstagramPublicationMediaKind =
  | 'image'
  | 'video';

export type InstagramPublicationStatus =
  | 'pending'
  | 'scheduled'
  | 'processing'
  | 'published'
  | 'failed'
  | 'cancelled';

export interface InstagramAccount {
  id: number;
  workspace_id: number;
  instagram_id: string;
  username: string;
  is_active: boolean;
  token_expires_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InstagramConnectionStatus {
  connected: boolean;
  account: InstagramAccount | null;
}

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string | null;
  account_type?: string | null;
  profile_picture_url?: string | null;
  followers_count?: number | null;
  follows_count?: number | null;
  media_count?: number | null;
}

export interface InstagramInsightValue {
  value: number;
  end_time?: string;
}

export interface InstagramInsight {
  name: string;
  period?: string;
  title?: string;
  description?: string;
  values?: InstagramInsightValue[];
  total_value?: {
    value: number;
  };
}

export interface InstagramMedia {
  id: string;
  caption?: string | null;
  media_type: InstagramMediaType;
  media_url?: string | null;
  permalink?: string | null;
  thumbnail_url?: string | null;
  timestamp?: string | null;
  username?: string | null;
}

export interface InstagramPublicationOptions {
  share_to_feed?: boolean;
}

export interface InstagramPublication {
  id: number;
  workspace_id?: number;
  instagram_account_id?: number;

  type: InstagramPublicationType;
  media_kind: InstagramPublicationMediaKind | null;

  caption: string | null;
  options?: InstagramPublicationOptions | null;

  staging_path?: string | null;
  container_id?: string | null;
  media_id?: string | null;

  status: InstagramPublicationStatus;

  scheduled_at: string | null;
  processing_started_at?: string | null;
  published_at?: string | null;

  error_message?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface InstagramCommentAuthor {
  id?: string;
  username?: string;
}

export interface InstagramComment {
  id: string;
  from?: InstagramCommentAuthor | null;
  text: string;
  timestamp?: string | null;
}

export interface InstagramConversationParticipant {
  id: string;
  username?: string;
  name?: string;
}

export interface InstagramConversation {
  id: string;
  participants?: {
    data?: InstagramConversationParticipant[];
  };
  updated_time?: string | null;
}

export interface InstagramMessageUser {
  id: string;
  username?: string;
  name?: string;
}

export interface InstagramMessage {
  id: string;
  created_time?: string | null;
  from?: InstagramMessageUser | null;
  to?: {
    data?: InstagramMessageUser[];
  };
  message?: string | null;
}

export interface InstagramConversationDetails {
  id: string;
  messages?: {
    data?: InstagramMessage[];
    paging?: unknown;
  };
}

export interface InstagramDashboard {
  connected: boolean;
  account?: InstagramAccount | null;
  profile?: InstagramProfile | null;
  insights?: InstagramInsight[];
  media?: InstagramMedia[];
}

export interface InstagramShowResponse {
  data: InstagramConnectionStatus;
}

export interface InstagramProfileResponse {
  data: {
    profile: InstagramProfile;
  };
}

export interface InstagramInsightsResponse {
  data: {
    insights: InstagramInsight[];
  };
}

export interface InstagramMediaResponse {
  data: {
    media: InstagramMedia[];
  };
}

export interface InstagramDashboardResponse {
  data: InstagramDashboard;
}

export interface InstagramPublicationsResponse {
  data: {
    publications: InstagramPublication[];
  };
}

export interface InstagramPublicationResponse {
  message: string;
  data: {
    publication: InstagramPublication;
  };
}

export interface InstagramCommentsResponse {
  data: {
    data: InstagramComment[];
    paging: unknown | null;
  };
}

export interface InstagramCommentActionResponse {
  message: string;
}

export interface InstagramConversationsResponse {
  data: {
    data: InstagramConversation[];
    paging: unknown | null;
  };
}

export interface InstagramConversationResponse {
  data: InstagramConversationDetails;
}

export interface InstagramMessageResponse {
  data: {
    message: InstagramMessage;
  };
}

export interface InstagramSendMessagePayload {
  recipient_id: string;
  message: string;
}

export interface InstagramSendMessageResponse {
  message: string;
  data?: {
    message_id?: string;
    recipient_id?: string;
  };
}

export interface InstagramReplyCommentPayload {
  message: string;
}

export interface InstagramReschedulePayload {
  scheduled_at: string;
}
