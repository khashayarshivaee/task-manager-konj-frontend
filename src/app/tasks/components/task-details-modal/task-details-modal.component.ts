import {
  Component,
  DestroyRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';

import {
  TaskCommentsComponent,
} from '../task-comments/task-comments.component';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {

  IonContent,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  calendarOutline,
  checkmarkCircleOutline,
  closeOutline,
  cloudUploadOutline,
  createOutline,
  flagOutline,
  imageOutline,
  openOutline,
  personCircleOutline,
  timeOutline,
  eyeOffOutline,
  eyeOutline,
  lockClosedOutline,
  refreshOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  ProjectTask,
  TaskAttachment,
  TaskUser,
  TaskWatcherState,
} from '../../models/task.model';
import {
  TaskService,
} from '../../services/task.service';
import {
  DeleteTaskModalComponent,
} from '../delete-task-modal/delete-task-modal.component';
import {
  EditTaskModalComponent,
} from '../edit-task-modal/edit-task-modal.component';

interface TaskAttachmentView {
  attachment: TaskAttachment;
  previewUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}

@Component({
  selector: 'app-task-details-modal',
  standalone: true,
  templateUrl:
    './task-details-modal.component.html',
  styleUrl:
    './task-details-modal.component.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    TaskCommentsComponent,
    UserAvatarComponent,
  ],
})
export class TaskDetailsModalComponent
  implements OnInit, OnDestroy {
  @Input({
    required: true,
  })
  workspaceId!: number;

  @Input({
    required: true,
  })
  projectId!: number;

  @Input({
    required: true,
  })
  taskId!: number;

  private readonly modalController =
    inject(ModalController);


  private readonly taskService =
    inject(TaskService);

  private readonly destroyRef =
    inject(DestroyRef);


  private readonly maximumFileSize =
    10 * 1024 * 1024;

  task: ProjectTask | null = null;
  watchers: TaskUser[] = [];

  isWatching = false;
  canComment = false;
  canUnwatch = false;

  isLoadingWatcherState = false;
  isUpdatingWatchState = false;

  watcherErrorMessage = '';
  watcherSuccessMessage = '';

  attachmentItems: TaskAttachmentView[] = [];

  isLoading = true;
  isLoadingAttachments = false;


  errorMessage = '';
  attachmentErrorMessage = '';

  constructor() {
    addIcons({
      calendarOutline,
      checkmarkCircleOutline,
      closeOutline,
      eyeOffOutline,
      eyeOutline,
      lockClosedOutline,
      refreshOutline,

      createOutline,
      flagOutline,
      imageOutline,
      openOutline,
      personCircleOutline,
      timeOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    this.loadTask();
  }

  ngOnDestroy(): void {
    this.revokeAttachmentUrls();
  }

  loadTask(): void {
    if (
      !Number.isInteger(this.workspaceId) ||
      !Number.isInteger(this.projectId) ||
      !Number.isInteger(this.taskId) ||
      this.workspaceId <= 0 ||
      this.projectId <= 0 ||
      this.taskId <= 0
    ) {
      this.isLoading = false;
      this.errorMessage =
        'The requested task address is invalid.';

      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.taskService
      .getTask(
        this.workspaceId,
        this.projectId,
        this.taskId,
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.task = response.data.task;

          this.loadWatcherState();
          this.loadAttachments();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.task = null;

          if (error.status === 403) {
            this.errorMessage =
              'You do not have access to this task.';

            return;
          }

          if (error.status === 404) {
            this.errorMessage =
              'This task could not be found in the selected project.';

            return;
          }

          this.errorMessage =
            'Unable to load the task. Please try again.';
        },
      });
  }

  loadWatcherState(): void {
    if (
      !this.task ||
      this.isLoadingWatcherState
    ) {
      return;
    }

    this.isLoadingWatcherState = true;
    this.watcherErrorMessage = '';

    this.taskService
      .getTaskWatchers(
        this.workspaceId,
        this.projectId,
        this.task.id,
      )
      .pipe(
        finalize(() => {
          this.isLoadingWatcherState = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.applyWatcherState(
            response.data,
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 403) {
            this.watcherErrorMessage =
              'You do not have access to this task discussion.';

            return;
          }

          if (error.status === 404) {
            this.watcherErrorMessage =
              'The watcher information could not be found.';

            return;
          }

          this.watcherErrorMessage =
            'Unable to load watcher information.';
        },
      });
  }
  watchTask(): void {
    if (
      !this.task ||
      this.isUpdatingWatchState
    ) {
      return;
    }

    this.isUpdatingWatchState = true;
    this.watcherErrorMessage = '';
    this.watcherSuccessMessage = '';

    this.taskService
      .watchTask(
        this.workspaceId,
        this.projectId,
        this.task.id,
      )
      .pipe(
        finalize(() => {
          this.isUpdatingWatchState = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.applyWatcherState(
            response.data,
          );

          this.watcherSuccessMessage =
            response.message;
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.watcherErrorMessage =
            error.error?.message ||
            'Unable to watch this task.';
        },
      });
  }
  unwatchTask(): void {
    if (
      !this.task ||
      this.isUpdatingWatchState ||
      !this.canUnwatch
    ) {
      return;
    }

    this.isUpdatingWatchState = true;
    this.watcherErrorMessage = '';
    this.watcherSuccessMessage = '';

    this.taskService
      .unwatchTask(
        this.workspaceId,
        this.projectId,
        this.task.id,
      )
      .pipe(
        finalize(() => {
          this.isUpdatingWatchState = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.applyWatcherState(
            response.data,
          );

          this.watcherSuccessMessage =
            response.message;
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.watcherErrorMessage =
            error.error?.message ||
            'Unable to stop watching this task.';
        },
      });
  }

  loadAttachments(): void {
    if (
      !this.task ||
      this.isLoadingAttachments
    ) {
      return;
    }

    this.isLoadingAttachments = true;
    this.attachmentErrorMessage = '';

    this.taskService
      .getAttachments(
        this.workspaceId,
        this.projectId,
        this.task.id,
      )
      .pipe(
        finalize(() => {
          this.isLoadingAttachments = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.revokeAttachmentUrls();

          this.attachmentItems =
            response.data.attachments.map(
              (attachment) => ({
                attachment,
                previewUrl: null,
                isLoading: true,
                hasError: false,
              }),
            );

          for (
            const item of this.attachmentItems
            ) {
            this.loadAttachmentPreview(
              item.attachment.id,
            );
          }
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.revokeAttachmentUrls();
          this.attachmentItems = [];

          if (error.status === 403) {
            this.attachmentErrorMessage =
              'You do not have access to these attachments.';

            return;
          }

          if (error.status === 404) {
            this.attachmentErrorMessage =
              'The task attachments could not be found.';

            return;
          }

          this.attachmentErrorMessage =
            'Unable to load task attachments.';
        },
      });
  }





  openAttachment(
    previewUrl: string | null,
  ): void {
    if (!previewUrl) {
      return;
    }

    window.open(
      previewUrl,
      '_blank',
      'noopener,noreferrer',
    );
  }

  close(): void {
    void this.modalController.dismiss(
      this.task,
      'closed',
    );
  }

  async requestEdit(): Promise<void> {
    if (!this.task) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        EditTaskModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          projectId: this.projectId,
          task: this.task,
        },

        cssClass: 'project-create-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<ProjectTask>();
    if (
      result.role === 'updated' &&
      result.data
    ) {
      this.task = result.data;

      this.loadWatcherState();
      this.loadAttachments();
    }
  }

  async requestDelete(): Promise<void> {
    if (!this.task) {
      return;
    }

    const task = this.task;

    const modal =
      await this.modalController.create({
        component:
        DeleteTaskModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          projectId: this.projectId,
          task,
        },

        cssClass: 'project-delete-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<number>();

    if (
      result.role === 'deleted' &&
      result.data === task.id
    ) {
      await this.modalController.dismiss(
        task,
        'deleted',
      );
    }
  }

  get visibleWatchers(): TaskUser[] {
    return this.watchers.slice(0, 5);
  }

  get hiddenWatcherCount(): number {
    return Math.max(
      this.watchers.length - 5,
      0,
    );
  }

  get watcherNames(): string {
    if (this.watchers.length === 0) {
      return 'No watchers';
    }

    return this.watchers
      .map((watcher) => watcher.name)
      .join(', ');
  }

  getTaskAssignees(
    task: ProjectTask,
  ): TaskUser[] {
    if (
      task.assignees &&
      task.assignees.length > 0
    ) {
      return task.assignees;
    }

    return task.assignee
      ? [task.assignee]
      : [];
  }

  getStatusLabel(
    status: ProjectTask['status'],
  ): string {
    return status
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (character: string) =>
          character.toUpperCase(),
      );
  }

  getPriorityLabel(
    priority: ProjectTask['priority'],
  ): string {
    return (
      priority.charAt(0).toUpperCase() +
      priority.slice(1)
    );
  }

  formatDate(
    value: string | null,
  ): string {
    if (!value) {
      return 'Not set';
    }

    const date = new Date(
      `${value.substring(0, 10)}T00:00:00`,
    );

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
    ).format(date);
  }

  formatFileSize(
    size: number,
  ): string {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(
        size / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  private loadAttachmentPreview(
    attachmentId: number,
  ): void {
    if (!this.task) {
      return;
    }

    this.taskService
      .getAttachmentFile(
        this.workspaceId,
        this.projectId,
        this.task.id,
        attachmentId,
      )
      .pipe(
        finalize(() => {
          this.attachmentItems =
            this.attachmentItems.map(
              (item) => {
                if (
                  item.attachment.id !==
                  attachmentId
                ) {
                  return item;
                }

                return {
                  ...item,
                  isLoading: false,
                  hasError:
                    item.previewUrl === null,
                };
              },
            );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          const previewUrl =
            URL.createObjectURL(blob);

          let attachmentStillExists = false;

          this.attachmentItems =
            this.attachmentItems.map(
              (item) => {
                if (
                  item.attachment.id !==
                  attachmentId
                ) {
                  return item;
                }

                attachmentStillExists = true;

                if (item.previewUrl) {
                  URL.revokeObjectURL(
                    item.previewUrl,
                  );
                }

                return {
                  ...item,
                  previewUrl,
                  isLoading: false,
                  hasError: false,
                };
              },
            );

          if (!attachmentStillExists) {
            URL.revokeObjectURL(
              previewUrl,
            );
          }
        },

        error: () => {
          this.attachmentItems =
            this.attachmentItems.map(
              (item) =>
                item.attachment.id ===
                attachmentId
                  ? {
                    ...item,
                    previewUrl: null,
                    isLoading: false,
                    hasError: true,
                  }
                  : item,
            );
        },
      });
  }



  private applyWatcherState(
    state: TaskWatcherState,
  ): void {
    this.watchers = state.watchers;
    this.isWatching = state.is_watching;
    this.canComment = state.can_comment;
    this.canUnwatch = state.can_unwatch;

    if (this.task) {
      this.task = {
        ...this.task,
        watchers: state.watchers,
      };
    }
  }

  private revokeAttachmentUrls(): void {
    for (
      const item of this.attachmentItems
      ) {
      if (item.previewUrl) {
        URL.revokeObjectURL(
          item.previewUrl,
        );
      }
    }
  }
}
