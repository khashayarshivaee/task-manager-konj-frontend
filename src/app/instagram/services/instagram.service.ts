import {
  HttpClient,
} from '@angular/common/http';
import {
  Injectable,
  inject,
} from '@angular/core';
import {
  Observable,
  map,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';

import {
  InstagramCommentActionResponse,
  InstagramCommentsResponse,
  InstagramConversationResponse,
  InstagramConversationsResponse,
  InstagramDashboard,
  InstagramDashboardResponse,
  InstagramInsight,
  InstagramInsightsResponse,
  InstagramMedia,
  InstagramMediaResponse,
  InstagramMessage,
  InstagramMessageResponse,
  InstagramProfile,
  InstagramProfileResponse,
  InstagramPublication,
  InstagramPublicationResponse,
  InstagramPublicationsResponse,
  InstagramReplyCommentPayload,
  InstagramReschedulePayload,
  InstagramSendMessagePayload,
  InstagramSendMessageResponse,
  InstagramShowResponse,
  InstagramConnectionStatus,
} from '../models/instagram.model';

@Injectable({
  providedIn: 'root',
})
export class InstagramService {
  private readonly http =
    inject(HttpClient);

  private readonly workspacesUrl =
    `${environment.apiUrl}/workspaces`;

  getConnectionStatus(
    workspaceId: number,
  ): Observable<InstagramConnectionStatus> {
    return this.http
      .get<InstagramShowResponse>(
        this.instagramUrl(
          workspaceId,
        ),
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }

  connect(
    workspaceId: number,
  ): Observable<InstagramConnectionStatus> {
    return this.http
      .post<InstagramShowResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/connect`,
        {},
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }

  disconnect(
    workspaceId: number,
  ): Observable<void> {
    return this.http.delete<void>(
      this.instagramUrl(
        workspaceId,
      ),
    );
  }

  getDashboard(
    workspaceId: number,
  ): Observable<InstagramDashboard> {
    return this.http
      .get<InstagramDashboardResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/dashboard`,
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }

  getProfile(
    workspaceId: number,
  ): Observable<InstagramProfile> {
    return this.http
      .get<InstagramProfileResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/profile`,
      )
      .pipe(
        map(
          (response) =>
            response.data.profile,
        ),
      );
  }

  getInsights(
    workspaceId: number,
  ): Observable<InstagramInsight[]> {
    return this.http
      .get<InstagramInsightsResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/insights`,
      )
      .pipe(
        map(
          (response) =>
            response.data.insights,
        ),
      );
  }

  getMedia(
    workspaceId: number,
  ): Observable<InstagramMedia[]> {
    return this.http
      .get<InstagramMediaResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/media`,
      )
      .pipe(
        map(
          (response) =>
            response.data.media,
        ),
      );
  }

  getPublications(
    workspaceId: number,
  ): Observable<InstagramPublication[]> {
    return this.http
      .get<InstagramPublicationsResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/publications`,
      )
      .pipe(
        map(
          (response) =>
            response.data.publications,
        ),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Publish Image
  |--------------------------------------------------------------------------
  */

  publishImage(
    workspaceId: number,
    file: File,
    caption: string,
  ): Observable<InstagramPublication> {
    const formData =
      new FormData();

    formData.append(
      'image',
      file,
    );

    formData.append(
      'caption',
      caption,
    );

    return this.http
      .post<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/media/image`,
        formData,
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Publish Image / Carousel
  |--------------------------------------------------------------------------
  */

  publishImages(
    workspaceId: number,
    files: File[],
    caption: string,
  ): Observable<InstagramPublication> {
    const formData =
      new FormData();

    for (
      const file
      of files
      ) {
      formData.append(
        'images[]',
        file,
      );
    }

    if (
      caption.trim() !== ''
    ) {
      formData.append(
        'caption',
        caption,
      );
    }

    return this.http
      .post<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/media/image`,
        formData,
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Publish Reel
  |--------------------------------------------------------------------------
  */

  publishReel(
    workspaceId: number,
    file: File,
    caption: string,
    shareToFeed: boolean,
  ): Observable<InstagramPublication> {
    const formData =
      new FormData();

    /*
     * Backend expects "video"
     * for direct Reel publishing.
     */
    formData.append(
      'video',
      file,
    );

    formData.append(
      'caption',
      caption,
    );

    formData.append(
      'share_to_feed',
      shareToFeed
        ? '1'
        : '0',
    );

    return this.http
      .post<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/media/reel`,
        formData,
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Publish Story Video
  |--------------------------------------------------------------------------
  */

  publishStoryVideo(
    workspaceId: number,
    file: File,
  ): Observable<InstagramPublication> {
    const formData =
      new FormData();

    /*
     * Backend expects "video"
     * for direct Story video publishing.
     */
    formData.append(
      'video',
      file,
    );

    return this.http
      .post<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/media/story`,
        formData,
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Publish Story Image
  |--------------------------------------------------------------------------
  */

  publishStoryImage(
    workspaceId: number,
    file: File,
  ): Observable<InstagramPublication> {
    const formData =
      new FormData();

    /*
     * Backend expects "image"
     * for direct Story image publishing.
     */
    formData.append(
      'image',
      file,
    );

    return this.http
      .post<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/media/story/image`,
        formData,
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Schedule Publication
  |--------------------------------------------------------------------------
  */

  schedulePublication(
    workspaceId: number,
    payload: {
      file?: File;
      files?: File[];
      type:
        | 'image'
        | 'reel'
        | 'story';
      mediaKind:
        | 'image'
        | 'video';
      scheduledAt: string;
      caption?: string;
      shareToFeed?: boolean;
    },
  ): Observable<InstagramPublication> {
    const formData =
      new FormData();

    const files =
      payload.files ?? [];

    /*
     * Scheduling intentionally uses
     * "file" / "files[]" because this
     * matches the backend scheduling API.
     */
    if (
      files.length > 0
    ) {
      for (
        const file
        of files
        ) {
        formData.append(
          'files[]',
          file,
        );
      }
    } else if (
      payload.file
    ) {
      formData.append(
        'file',
        payload.file,
      );
    }

    formData.append(
      'type',
      payload.type,
    );

    formData.append(
      'media_kind',
      payload.mediaKind,
    );

    formData.append(
      'scheduled_at',
      payload.scheduledAt,
    );

    if (
      payload.caption &&
      payload.caption.trim() !== ''
    ) {
      formData.append(
        'caption',
        payload.caption,
      );
    }

    if (
      payload.type === 'reel' &&
      payload.shareToFeed !== undefined
    ) {
      formData.append(
        'share_to_feed',
        payload.shareToFeed
          ? '1'
          : '0',
      );
    }

    return this.http
      .post<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/publications/schedule`,
        formData,
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Publication Actions
  |--------------------------------------------------------------------------
  */

  continuePublication(
    workspaceId: number,
    publicationId: number,
  ): Observable<InstagramPublication> {
    return this.http
      .post<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/publications/${publicationId}/continue`,
        {},
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  cancelPublication(
    workspaceId: number,
    publicationId: number,
  ): Observable<InstagramPublication> {
    return this.http
      .delete<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/publications/${publicationId}`,
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  reschedulePublication(
    workspaceId: number,
    publicationId: number,
    scheduledAt: string,
  ): Observable<InstagramPublication> {
    const payload:
      InstagramReschedulePayload = {
      scheduled_at:
      scheduledAt,
    };

    return this.http
      .patch<InstagramPublicationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/publications/${publicationId}/reschedule`,
        payload,
      )
      .pipe(
        map(
          (response) =>
            response.data.publication,
        ),
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Comments
  |--------------------------------------------------------------------------
  */

  getComments(
    workspaceId: number,
    mediaId: string,
  ) {
    return this.http
      .get<InstagramCommentsResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/media/${mediaId}/comments`,
      )
      .pipe(
        map(
          (response) =>
            response.data.data,
        ),
      );
  }

  replyToComment(
    workspaceId: number,
    commentId: string,
    message: string,
  ): Observable<InstagramCommentActionResponse> {
    const payload:
      InstagramReplyCommentPayload = {
      message,
    };

    return this.http
      .post<InstagramCommentActionResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/comments/${commentId}/reply`,
        payload,
      );
  }

  hideComment(
    workspaceId: number,
    commentId: string,
  ): Observable<InstagramCommentActionResponse> {
    return this.http
      .post<InstagramCommentActionResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/comments/${commentId}/hide`,
        {},
      );
  }

  unhideComment(
    workspaceId: number,
    commentId: string,
  ): Observable<InstagramCommentActionResponse> {
    return this.http
      .post<InstagramCommentActionResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/comments/${commentId}/unhide`,
        {},
      );
  }

  deleteComment(
    workspaceId: number,
    commentId: string,
  ): Observable<InstagramCommentActionResponse> {
    return this.http
      .delete<InstagramCommentActionResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/comments/${commentId}`,
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Inbox
  |--------------------------------------------------------------------------
  */

  getConversations(
    workspaceId: number,
  ) {
    return this.http
      .get<InstagramConversationsResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/conversations`,
      )
      .pipe(
        map(
          (response) =>
            response.data.data,
        ),
      );
  }

  getConversation(
    workspaceId: number,
    conversationId: string,
  ) {
    return this.http
      .get<InstagramConversationResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/conversations/${conversationId}`,
      )
      .pipe(
        map(
          (response) =>
            response.data,
        ),
      );
  }

  getMessage(
    workspaceId: number,
    messageId: string,
  ): Observable<InstagramMessage> {
    return this.http
      .get<InstagramMessageResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/messages/${messageId}`,
      )
      .pipe(
        map(
          (response) =>
            response.data.message,
        ),
      );
  }

  sendMessage(
    workspaceId: number,
    recipientId: string,
    message: string,
  ): Observable<InstagramSendMessageResponse> {
    const payload:
      InstagramSendMessagePayload = {
      recipient_id:
      recipientId,

      message,
    };

    return this.http
      .post<InstagramSendMessageResponse>(
        `${this.instagramUrl(
          workspaceId,
        )}/messages`,
        payload,
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Media Proxy
  |--------------------------------------------------------------------------
  */

  getMediaProxy(
    mediaUrl: string,
  ): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/instagram/media-proxy`,
      {
        params: {
          url: mediaUrl,
        },

        responseType:
          'blob',
      },
    );
  }

  /*
  |--------------------------------------------------------------------------
  | URL
  |--------------------------------------------------------------------------
  */

  private instagramUrl(
    workspaceId: number,
  ): string {
    return (
      `${this.workspacesUrl}/${workspaceId}/instagram`
    );
  }
}
