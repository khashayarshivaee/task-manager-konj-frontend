import {
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

import {
  DatePipe,
} from '@angular/common';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  IonCard,
  IonContent,
  IonIcon,
  IonModal,
  IonSpinner,
} from '@ionic/angular/standalone';

import {
  addIcons,
} from 'ionicons';

import {
  arrowBackOutline,
  calendarOutline,
  chatbubbleEllipsesOutline,
  cloudUploadOutline,
  logoInstagram,
  mailOutline,
  refreshOutline,
  statsChartOutline,
} from 'ionicons/icons';

import {
  finalize,
  forkJoin,
  of,
  switchMap,
} from 'rxjs';

import {
  InstagramComment,
  InstagramConnectionStatus,
  InstagramMessageUser,
  InstagramConversation,
  InstagramConversationDetails,
  InstagramDashboard,
  InstagramMedia,
  InstagramMessage,
  InstagramPublication,
} from '../../models/instagram.model';

import {
  InstagramService,
} from '../../services/instagram.service';

type InstagramManagerSection =
  | 'overview'
  | 'publish'
  | 'scheduled'
  | 'comments'
  | 'inbox';

@Component({
  selector: 'app-instagram-manager',
  templateUrl:
    './instagram-manager.page.html',
  styleUrls: [
    './instagram-manager.page.scss',
  ],
  imports: [
    IonCard,
    IonContent,
    IonIcon,
    IonModal,
    DatePipe,
    IonSpinner,
  ],
})
export class InstagramManagerPage
  implements OnInit, OnDestroy {

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly instagramService =
    inject(InstagramService);

  workspaceId: number | null = null;

  activeSection:
    InstagramManagerSection =
    'overview';

  connection:
    InstagramConnectionStatus | null =
    null;

  dashboard:
    InstagramDashboard | null =
    null;



  instagramMedia:
    InstagramMedia[] = [];

  publications:
    InstagramPublication[] = [];

  isLoading = false;

  loadError = '';

  lastUpdatedAt:
    Date | null = null;

  messageDraft = '';

  isSendingMessage = false;

  messageSendError = '';

  /*
  |--------------------------------------------------------------------------
  | Instagram Media Preview
  |--------------------------------------------------------------------------
  */

  mediaPreviewUrls:
    Record<string, string> = {};

  mediaPreviewLoading:
    Record<string, boolean> = {};

  /*
  |--------------------------------------------------------------------------
  | Publish
  |--------------------------------------------------------------------------
  */

  publishType:
    'image' | 'reel' | 'story' =
    'image';

  storyMediaKind:
    'image' | 'video' =
    'image';

  publishFile:
    File | null = null;

  publishPreviewUrl:
    string | null = null;

  publishImages: {
    file: File;
    previewUrl: string;
  }[] = [];

  publishCaption = '';

  shareToFeed = true;

  isPublishing = false;

  publishError = '';

  publishSuccess = '';

  publishTiming:
    'now' | 'scheduled' =
    'now';

  publishScheduledAt = '';

  /*
  |--------------------------------------------------------------------------
  | Scheduled Publications
  |--------------------------------------------------------------------------
  */

  processingPublicationId:
    number | null = null;

  reschedulePublicationId:
    number | null = null;

  rescheduleDateTime = '';

  publicationActionError = '';

  publicationActionSuccess = '';

  /*
  |--------------------------------------------------------------------------
  | Comments
  |--------------------------------------------------------------------------
  */

  selectedCommentsMedia:
    InstagramMedia | null = null;

  instagramComments:
    InstagramComment[] = [];

  isCommentsLoading = false;

  commentsError = '';

  commentReplyText = '';

  replyingCommentId:
    string | null = null;

  processingCommentId:
    string | null = null;

  commentsMediaPage = 1;

  readonly commentsMediaPageSize = 5;

  isCommentsModalOpen = false;

  /*
  |--------------------------------------------------------------------------
  | Inbox
  |--------------------------------------------------------------------------
  */

  instagramConversations:
    InstagramConversation[] = [];

  selectedConversation:
    InstagramConversationDetails | null =
    null;

  instagramMessages:
    InstagramMessage[] = [];

  isInboxLoading = false;

  inboxError = '';

  isConversationLoading = false;

  conversationError = '';

  constructor() {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      chatbubbleEllipsesOutline,
      cloudUploadOutline,
      logoInstagram,
      mailOutline,
      refreshOutline,
      statsChartOutline,
    });
  }

  ngOnInit(): void {
    const workspaceId =
      Number(
        this.route.snapshot.paramMap.get(
          'workspaceId',
        ),
      );

    if (
      !Number.isInteger(workspaceId) ||
      workspaceId <= 0
    ) {
      void this.router.navigateByUrl(
        '/home',
      );

      return;
    }

    this.workspaceId =
      workspaceId;

    this.load();
  }

  /*
  |--------------------------------------------------------------------------
  | Main Load
  |--------------------------------------------------------------------------
  */

  load(): void {
    if (
      this.workspaceId === null ||
      this.isLoading
    ) {
      return;
    }

    const workspaceId =
      this.workspaceId;

    this.isLoading = true;

    this.loadError = '';

    this.instagramService
      .getConnectionStatus(
        workspaceId,
      )
      .pipe(
        switchMap(
          (
            connection,
          ) => {
            this.connection =
              connection;

            if (
              !connection.connected
            ) {
              return of({
                dashboard: null,
                media:
                  [] as InstagramMedia[],
                publications:
                  [] as InstagramPublication[],
              });
            }

            return forkJoin({
              dashboard:
                this.instagramService
                  .getDashboard(
                    workspaceId,
                  ),

              media:
                this.instagramService
                  .getMedia(
                    workspaceId,
                  ),

              publications:
                this.instagramService
                  .getPublications(
                    workspaceId,
                  ),
            });
          },
        ),

        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: ({
                 dashboard,
                 media,
                 publications,
               }) => {
          this.dashboard =
            dashboard;

          this.instagramMedia =
            media;

          this.commentsMediaPage = 1;

          this.loadMediaPreviews(
            media,
          );

          this.publications =
            publications;

          this.lastUpdatedAt =
            new Date();
        },

        error: () => {
          this.loadError =
            'Unable to load Instagram Manager.';
        },
      });
  }

  refresh(): void {
    this.load();
  }

  /*
  |--------------------------------------------------------------------------
  | Navigation
  |--------------------------------------------------------------------------
  */

  setSection(
    section:
    InstagramManagerSection,
  ): void {
    this.activeSection =
      section;

    if (
      section === 'inbox' &&
      this.instagramConversations
        .length === 0
    ) {
      this.loadConversations();
    }
  }

  isSectionActive(
    section:
    InstagramManagerSection,
  ): boolean {
    return (
      this.activeSection ===
      section
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Publish Type
  |--------------------------------------------------------------------------
  */

  setPublishType(
    type:
      'image'
      | 'reel'
      | 'story',
  ): void {
    if (
      this.publishType === type
    ) {
      return;
    }

    this.publishType =
      type;

    this.clearPublishFile();

    this.publishError = '';

    this.publishSuccess = '';

    if (
      type !== 'story'
    ) {
      this.storyMediaKind =
        'image';
    }
  }

  setStoryMediaKind(
    mediaKind:
      'image' | 'video',
  ): void {
    if (
      this.storyMediaKind ===
      mediaKind
    ) {
      return;
    }

    this.storyMediaKind =
      mediaKind;

    this.clearPublishFile();

    this.publishError = '';

    this.publishSuccess = '';
  }

  /*
  |--------------------------------------------------------------------------
  | Publish File
  |--------------------------------------------------------------------------
  */

  onPublishFileSelected(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const selectedFiles =
      Array.from(
        input.files ?? [],
      );

    this.publishError = '';
    this.publishSuccess = '';

    if (
      this.publishType === 'image'
    ) {
      if (
        selectedFiles.length === 0
      ) {
        return;
      }

      if (
        this.publishImages.length +
        selectedFiles.length >
        10
      ) {
        this.publishError =
          'You can select up to 10 images.';

        input.value = '';

        return;
      }

      const newImages =
        selectedFiles.map(
          (file) => ({
            file,
            previewUrl:
              URL.createObjectURL(
                file,
              ),
          }),
        );

      this.publishImages = [
        ...this.publishImages,
        ...newImages,
      ];

      /*
       * Allows selecting the same file again
       * after removing it.
       */
      input.value = '';

      return;
    }

    const file =
      selectedFiles[0] ??
      null;

    this.clearPublishPreview();

    this.publishFile =
      file;

    if (!file) {
      return;
    }

    this.publishPreviewUrl =
      URL.createObjectURL(
        file,
      );

    input.value = '';
  }

  removePublishImage(
    index: number,
  ): void {
    const image =
      this.publishImages[index];

    if (!image) {
      return;
    }

    URL.revokeObjectURL(
      image.previewUrl,
    );

    this.publishImages =
      this.publishImages.filter(
        (
          _,
          itemIndex,
        ) =>
          itemIndex !== index,
      );

    this.publishError = '';
    this.publishSuccess = '';
  }

  movePublishImage(
    index: number,
    direction: -1 | 1,
  ): void {
    const targetIndex =
      index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      index >=
      this.publishImages.length ||
      targetIndex >=
      this.publishImages.length
    ) {
      return;
    }

    const reordered = [
      ...this.publishImages,
    ];

    [
      reordered[index],
      reordered[targetIndex],
    ] = [
      reordered[targetIndex],
      reordered[index],
    ];

    this.publishImages =
      reordered;
  }

  clearPublishFile(): void {
    this.clearPublishPreview();

    this.publishFile = null;

    for (
      const image
      of this.publishImages
      ) {
      URL.revokeObjectURL(
        image.previewUrl,
      );
    }

    this.publishImages = [];
  }

  private clearPublishPreview():
    void {
    if (
      !this.publishPreviewUrl
    ) {
      return;
    }

    URL.revokeObjectURL(
      this.publishPreviewUrl,
    );

    this.publishPreviewUrl =
      null;
  }

  /*
  |--------------------------------------------------------------------------
  | Publish Timing
  |--------------------------------------------------------------------------
  */

  setPublishTiming(
    timing:
      'now' | 'scheduled',
  ): void {
    this.publishTiming =
      timing;

    this.publishError = '';

    this.publishSuccess = '';

    if (
      timing === 'now'
    ) {
      this.publishScheduledAt =
        '';
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Publish Now
  |--------------------------------------------------------------------------
  */

  publishNow(): void {
    if (
      this.workspaceId === null ||
      this.isPublishing
    ) {
      return;
    }

    const isImage =
      this.publishType === 'image';

    if (
      isImage &&
      this.publishImages.length === 0
    ) {
      this.publishError =
        'Select at least one image.';

      return;
    }

    if (
      !isImage &&
      this.publishFile === null
    ) {
      return;
    }

    const workspaceId =
      this.workspaceId;

    const caption =
      this.publishCaption
        .trim();

    this.isPublishing =
      true;

    this.publishError = '';

    this.publishSuccess = '';

    const request =
      isImage
        ? this.instagramService
          .publishImages(
            workspaceId,
            this.publishImages.map(
              (image) =>
                image.file,
            ),
            caption,
          )
        : this.publishType ===
        'reel'
          ? this.instagramService
            .publishReel(
              workspaceId,
              this.publishFile!,
              caption,
              this.shareToFeed,
            )
          : this.storyMediaKind ===
          'image'
            ? this.instagramService
              .publishStoryImage(
                workspaceId,
                this.publishFile!,
              )
            : this.instagramService
              .publishStoryVideo(
                workspaceId,
                this.publishFile!,
              );

    request
      .pipe(
        finalize(() => {
          this.isPublishing =
            false;
        }),
      )
      .subscribe({
        next: (
          publication,
        ) => {
          this.publications = [
            publication,
            ...this.publications
              .filter(
                (
                  item,
                ) =>
                  item.id !==
                  publication.id,
              ),
          ];

          this.publishSuccess =
            publication.type ===
            'carousel'
              ? 'Carousel published successfully.'
              : 'Content published successfully.';

          this.publishCaption =
            '';

          this.publishScheduledAt =
            '';

          this.clearPublishFile();

          this.lastUpdatedAt =
            new Date();
        },

        error: () => {
          this.publishError =
            'Unable to publish Instagram content.';
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Scheduled Publication
  |--------------------------------------------------------------------------
  */

  get scheduledPublications():
    InstagramPublication[] {
    return this.publications
      .filter(
        (
          publication,
        ) =>
          publication.status ===
          'scheduled',
      );
  }

  scheduleContent(): void {
    if (
      this.workspaceId === null ||
      this.isPublishing ||
      this.publishScheduledAt
        .trim() === ''
    ) {
      return;
    }

    const isImage =
      this.publishType === 'image';

    if (
      isImage &&
      this.publishImages.length === 0
    ) {
      this.publishError =
        'Select at least one image.';

      return;
    }

    if (
      !isImage &&
      this.publishFile === null
    ) {
      return;
    }

    const scheduledDate =
      new Date(
        this.publishScheduledAt,
      );

    if (
      Number.isNaN(
        scheduledDate.getTime(),
      ) ||
      scheduledDate.getTime() <=
      Date.now()
    ) {
      this.publishError =
        'Select a future date and time.';

      return;
    }

    const mediaKind:
      'image' | 'video' =
      this.publishType ===
      'image'
        ? 'image'
        : this.publishType ===
        'reel'
          ? 'video'
          : this.storyMediaKind;

    this.isPublishing =
      true;

    this.publishError = '';

    this.publishSuccess = '';

    const request =
      isImage
        ? this.instagramService
          .schedulePublication(
            this.workspaceId,
            {
              files:
                this.publishImages.map(
                  (image) =>
                    image.file,
                ),

              type: 'image',

              mediaKind:
                'image',

              scheduledAt:
                scheduledDate
                  .toISOString(),

              caption:
                this.publishCaption
                  .trim(),
            },
          )
        : this.instagramService
          .schedulePublication(
            this.workspaceId,
            {
              file:
                this.publishFile!,

              type:
              this.publishType,

              mediaKind,

              scheduledAt:
                scheduledDate
                  .toISOString(),

              caption:
                this.publishType ===
                'story'
                  ? undefined
                  : this.publishCaption
                    .trim(),

              shareToFeed:
                this.publishType ===
                'reel'
                  ? this.shareToFeed
                  : undefined,
            },
          );

    request
      .pipe(
        finalize(() => {
          this.isPublishing =
            false;
        }),
      )
      .subscribe({
        next: (
          publication,
        ) => {
          this.publications = [
            publication,
            ...this.publications
              .filter(
                (
                  item,
                ) =>
                  item.id !==
                  publication.id,
              ),
          ];

          this.publishSuccess =
            publication.type ===
            'carousel'
              ? 'Carousel scheduled successfully.'
              : 'Content scheduled successfully.';

          this.publishCaption =
            '';

          this.publishScheduledAt =
            '';

          this.clearPublishFile();

          this.lastUpdatedAt =
            new Date();
        },

        error: () => {
          this.publishError =
            'Unable to schedule Instagram content.';
        },
      });
  }

  startReschedule(
    publication:
    InstagramPublication,
  ): void {
    if (
      !publication.scheduled_at
    ) {
      return;
    }

    this.reschedulePublicationId =
      publication.id;

    this.rescheduleDateTime =
      this.toLocalDateTimeValue(
        publication.scheduled_at,
      );

    this.publicationActionError =
      '';

    this.publicationActionSuccess =
      '';
  }

  closeReschedule(): void {
    this.reschedulePublicationId =
      null;

    this.rescheduleDateTime =
      '';

    this.publicationActionError =
      '';
  }

  reschedulePublication(
    publication:
    InstagramPublication,
  ): void {
    if (
      this.workspaceId ===
      null ||
      this.processingPublicationId !==
      null ||
      this.rescheduleDateTime
        .trim() === ''
    ) {
      return;
    }

    const scheduledDate =
      new Date(
        this.rescheduleDateTime,
      );

    if (
      Number.isNaN(
        scheduledDate.getTime(),
      ) ||
      scheduledDate.getTime() <=
      Date.now()
    ) {
      this.publicationActionError =
        'Select a future date and time.';

      return;
    }

    this.processingPublicationId =
      publication.id;

    this.publicationActionError =
      '';

    this.publicationActionSuccess =
      '';

    this.instagramService
      .reschedulePublication(
        this.workspaceId,
        publication.id,
        scheduledDate
          .toISOString(),
      )
      .pipe(
        finalize(() => {
          this.processingPublicationId =
            null;
        }),
      )
      .subscribe({
        next: (
          updatedPublication,
        ) => {
          this.updatePublication(
            updatedPublication,
          );

          this.reschedulePublicationId =
            null;

          this.rescheduleDateTime =
            '';

          this.publicationActionSuccess =
            'Publication rescheduled successfully.';
        },

        error: () => {
          this.publicationActionError =
            'Unable to reschedule publication.';
        },
      });
  }

  cancelScheduledPublication(
    publication:
    InstagramPublication,
  ): void {
    if (
      this.workspaceId ===
      null ||
      this.processingPublicationId !==
      null
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'Cancel this scheduled publication?',
      );

    if (!confirmed) {
      return;
    }

    this.processingPublicationId =
      publication.id;

    this.publicationActionError =
      '';

    this.publicationActionSuccess =
      '';

    this.instagramService
      .cancelPublication(
        this.workspaceId,
        publication.id,
      )
      .pipe(
        finalize(() => {
          this.processingPublicationId =
            null;
        }),
      )
      .subscribe({
        next: (
          updatedPublication,
        ) => {
          this.updatePublication(
            updatedPublication,
          );

          if (
            this.reschedulePublicationId ===
            publication.id
          ) {
            this.reschedulePublicationId =
              null;

            this.rescheduleDateTime =
              '';
          }

          this.publicationActionSuccess =
            'Scheduled publication cancelled.';
        },

        error: () => {
          this.publicationActionError =
            'Unable to cancel publication.';
        },
      });
  }

  private updatePublication(
    updatedPublication:
    InstagramPublication,
  ): void {
    const exists =
      this.publications.some(
        (
          publication,
        ) =>
          publication.id ===
          updatedPublication.id,
      );

    if (!exists) {
      this.publications = [
        updatedPublication,
        ...this.publications,
      ];

      return;
    }

    this.publications =
      this.publications.map(
        (
          publication,
        ) =>
          publication.id ===
          updatedPublication.id
            ? updatedPublication
            : publication,
      );
  }

  private toLocalDateTimeValue(
    value: string,
  ): string {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return '';
    }

    const offset =
      date.getTimezoneOffset();

    const localDate =
      new Date(
        date.getTime() -
        offset * 60_000,
      );

    return localDate
      .toISOString()
      .slice(
        0,
        16,
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Inbox
  |--------------------------------------------------------------------------
  */

  loadConversations(): void {
    if (
      this.workspaceId ===
      null ||
      this.isInboxLoading
    ) {
      return;
    }

    this.isInboxLoading =
      true;

    this.inboxError = '';

    this.instagramService
      .getConversations(
        this.workspaceId,
      )
      .pipe(
        finalize(() => {
          this.isInboxLoading =
            false;
        }),
      )
      .subscribe({
        next: (
          conversations,
        ) => {
          this.instagramConversations =
            conversations;
        },

        error: () => {
          this.inboxError =
            'Unable to load Instagram conversations.';
        },
      });
  }

  openConversation(
    conversation:
    InstagramConversation,
  ): void {
    if (
      this.workspaceId === null ||
      this.isConversationLoading
    ) {
      return;
    }

    this.isConversationLoading =
      true;

    this.conversationError =
      '';

    this.selectedConversation =
      null;

    this.instagramMessages =
      [];

    this.instagramService
      .getConversation(
        this.workspaceId,
        conversation.id,
      )
      .pipe(
        finalize(() => {
          this.isConversationLoading =
            false;
        }),
      )
      .subscribe({
        next: (
          details,
        ) => {
          this.selectedConversation =
            details;

          this.instagramMessages =
            details.messages?.data ??
            [];
        },

        error: () => {
          this.conversationError =
            'Unable to load Instagram conversation.';
        },
      });
  }

  closeConversation(): void {
    this.selectedConversation =
      null;

    this.instagramMessages =
      [];

    this.conversationError =
      '';

    this.messageDraft =
      '';

    this.messageSendError =
      '';
  }

  /*
  |--------------------------------------------------------------------------
  | Comments
  |--------------------------------------------------------------------------
  */

  get commentsMediaTotalPages():
    number {
    return Math.max(
      1,
      Math.ceil(
        this.instagramMedia.length /
        this.commentsMediaPageSize,
      ),
    );
  }

  get paginatedCommentsMedia():
    InstagramMedia[] {
    const start =
      (
        this.commentsMediaPage -
        1
      ) *
      this.commentsMediaPageSize;

    return this.instagramMedia.slice(
      start,
      start +
      this.commentsMediaPageSize,
    );
  }

  get commentsMediaVisiblePages():
    number[] {
    const total =
      this.commentsMediaTotalPages;

    const maxVisible = 5;

    let start =
      Math.max(
        1,
        this.commentsMediaPage - 2,
      );

    let end =
      Math.min(
        total,
        start +
        maxVisible -
        1,
      );

    start =
      Math.max(
        1,
        end -
        maxVisible +
        1,
      );

    return Array.from(
      {
        length:
          end -
          start +
          1,
      },
      (
        _,
        index,
      ) =>
        start +
        index,
    );
  }

  setCommentsMediaPage(
    page: number,
  ): void {
    if (
      page < 1 ||
      page >
      this.commentsMediaTotalPages ||
      page ===
      this.commentsMediaPage
    ) {
      return;
    }

    this.commentsMediaPage =
      page;
  }

  selectCommentsMedia(
    media: InstagramMedia,
  ): void {
    this.selectedCommentsMedia =
      media;

    this.instagramComments =
      [];

    this.commentsError =
      '';

    this.commentReplyText =
      '';

    this.replyingCommentId =
      null;

    this.isCommentsModalOpen =
      true;

    this.loadComments();
  }

  closeCommentsModal(): void {
    this.isCommentsModalOpen =
      false;
  }

  onCommentsModalDidDismiss():
    void {
    this.isCommentsModalOpen =
      false;

    this.selectedCommentsMedia =
      null;

    this.instagramComments =
      [];

    this.commentsError =
      '';

    this.commentReplyText =
      '';

    this.replyingCommentId =
      null;
  }

  loadComments(): void {
    if (
      this.workspaceId ===
      null ||
      this.selectedCommentsMedia ===
      null ||
      this.isCommentsLoading
    ) {
      return;
    }

    this.isCommentsLoading =
      true;

    this.commentsError =
      '';

    this.instagramService
      .getComments(
        this.workspaceId,
        this.selectedCommentsMedia
          .id,
      )
      .pipe(
        finalize(() => {
          this.isCommentsLoading =
            false;
        }),
      )
      .subscribe({
        next: (
          comments,
        ) => {
          this.instagramComments =
            comments;
        },

        error: () => {
          this.commentsError =
            'Unable to load Instagram comments.';
        },
      });
  }

  startCommentReply(
    comment:
    InstagramComment,
  ): void {
    this.replyingCommentId =
      comment.id;

    this.commentReplyText =
      '';
  }

  cancelCommentReply(): void {
    this.replyingCommentId =
      null;

    this.commentReplyText =
      '';
  }

  submitCommentReply(
    comment:
    InstagramComment,
  ): void {
    if (
      this.workspaceId ===
      null ||
      this.processingCommentId !==
      null
    ) {
      return;
    }

    const message =
      this.commentReplyText
        .trim();

    if (
      message === ''
    ) {
      return;
    }

    this.processingCommentId =
      comment.id;

    this.commentsError =
      '';

    this.instagramService
      .replyToComment(
        this.workspaceId,
        comment.id,
        message,
      )
      .pipe(
        finalize(() => {
          this.processingCommentId =
            null;
        }),
      )
      .subscribe({
        next: () => {
          this.replyingCommentId =
            null;

          this.commentReplyText =
            '';

          this.loadComments();
        },

        error: () => {
          this.commentsError =
            'Unable to reply to comment.';
        },
      });
  }

  hideComment(
    comment:
    InstagramComment,
  ): void {
    if (
      this.workspaceId ===
      null ||
      this.processingCommentId !==
      null
    ) {
      return;
    }

    this.processingCommentId =
      comment.id;

    this.commentsError =
      '';

    this.instagramService
      .hideComment(
        this.workspaceId,
        comment.id,
      )
      .pipe(
        finalize(() => {
          this.processingCommentId =
            null;
        }),
      )
      .subscribe({
        next: () => {
          this.loadComments();
        },

        error: () => {
          this.commentsError =
            'Unable to hide comment.';
        },
      });
  }

  deleteInstagramComment(
    comment:
    InstagramComment,
  ): void {
    if (
      this.workspaceId ===
      null ||
      this.processingCommentId !==
      null
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'Delete this Instagram comment?',
      );

    if (!confirmed) {
      return;
    }

    this.processingCommentId =
      comment.id;

    this.commentsError =
      '';

    this.instagramService
      .deleteComment(
        this.workspaceId,
        comment.id,
      )
      .pipe(
        finalize(() => {
          this.processingCommentId =
            null;
        }),
      )
      .subscribe({
        next: () => {
          this.instagramComments =
            this.instagramComments
              .filter(
                (
                  item,
                ) =>
                  item.id !==
                  comment.id,
              );
        },

        error: () => {
          this.commentsError =
            'Unable to delete comment.';
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Media Proxy
  |--------------------------------------------------------------------------
  */

  getMediaPreviewUrl(
    media:
    InstagramMedia,
  ): string | null {
    return (
      this.mediaPreviewUrls[
        media.id
        ] ?? null
    );
  }

  loadMediaPreviews(
    mediaItems:
    InstagramMedia[],
  ): void {
    for (
      const media
      of mediaItems
      ) {
      if (
        this.mediaPreviewUrls[
          media.id
          ] ||
        this.mediaPreviewLoading[
          media.id
          ]
      ) {
        continue;
      }

      const sourceUrl =
        this.getMediaPreviewSource(
          media,
        );

      if (!sourceUrl) {
        continue;
      }

      this.mediaPreviewLoading = {
        ...this.mediaPreviewLoading,

        [media.id]:
          true,
      };

      this.instagramService
        .getMediaProxy(
          sourceUrl,
        )
        .subscribe({
          next: (
            blob,
          ) => {
            const previousUrl =
              this.mediaPreviewUrls[
                media.id
                ];

            if (
              previousUrl
            ) {
              URL.revokeObjectURL(
                previousUrl,
              );
            }

            this.mediaPreviewUrls = {
              ...this.mediaPreviewUrls,

              [media.id]:
                URL.createObjectURL(
                  blob,
                ),
            };

            this.mediaPreviewLoading = {
              ...this.mediaPreviewLoading,

              [media.id]:
                false,
            };
          },

          error: () => {
            this.mediaPreviewLoading = {
              ...this.mediaPreviewLoading,

              [media.id]:
                false,
            };
          },
        });
    }
  }

  private getMediaPreviewSource(
    media:
    InstagramMedia,
  ): string | null {
    if (
      media.thumbnail_url
    ) {
      return (
        media.thumbnail_url
      );
    }

    if (
      media.media_type ===
      'IMAGE' ||
      media.media_type ===
      'CAROUSEL_ALBUM'
    ) {
      return (
        media.media_url ??
        null
      );
    }

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Cleanup
  |--------------------------------------------------------------------------
  */

  ngOnDestroy(): void {
    this.clearPublishFile();

    for (
      const previewUrl
      of Object.values(
      this.mediaPreviewUrls,
    )
      ) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }
  }

  get selectedConversationRecipient():
    InstagramMessageUser | null {
    const ownUsername =
      this.connection?.account?.username;

    if (!ownUsername) {
      return null;
    }

    for (
      const message
      of this.instagramMessages
      ) {
      if (
        message.from?.username &&
        message.from.username !==
        ownUsername
      ) {
        return message.from;
      }

      const recipient =
        message.to?.data?.find(
          (user) =>
            user.username !==
            ownUsername,
        );

      if (recipient) {
        return recipient;
      }
    }

    return null;
  }

  get sortedInstagramMessages():
    InstagramMessage[] {
    return [
      ...this.instagramMessages,
    ].sort(
      (
        first,
        second,
      ) => {
        const firstTime =
          first.created_time
            ? new Date(
              first.created_time,
            ).getTime()
            : 0;

        const secondTime =
          second.created_time
            ? new Date(
              second.created_time,
            ).getTime()
            : 0;

        return (
          firstTime -
          secondTime
        );
      },
    );
  }

  isOwnInstagramMessage(
    message: InstagramMessage,
  ): boolean {
    const ownUsername =
      this.connection?.account
        ?.username;

    return (
      !!ownUsername &&
      message.from?.username ===
      ownUsername
    );
  }

  sendInstagramMessage(): void {
    if (
      this.workspaceId === null ||
      this.isSendingMessage
    ) {
      return;
    }

    const recipient =
      this.selectedConversationRecipient;

    const message =
      this.messageDraft.trim();

    const conversationId =
      this.selectedConversation?.id;

    if (
      !recipient ||
      !conversationId ||
      message === ''
    ) {
      return;
    }

    this.isSendingMessage = true;

    this.messageSendError = '';

    this.instagramService
      .sendMessage(
        this.workspaceId,
        recipient.id,
        message,
      )
      .pipe(
        finalize(() => {
          this.isSendingMessage =
            false;
        }),
      )
      .subscribe({
        next: () => {
          this.messageDraft = '';

          const conversation =
            this.instagramConversations
              .find(
                (item) =>
                  item.id ===
                  conversationId,
              );

          if (conversation) {
            this.openConversation(
              conversation,
            );
          }
        },

        error: () => {
          this.messageSendError =
            'Unable to send Instagram message.';
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Back
  |--------------------------------------------------------------------------
  */

  goBack(): void {
    void this.router
      .navigateByUrl(
        '/home',
      );
  }
}
