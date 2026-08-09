import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
} from '@angular/core';
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
  closeOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';
import {
  ProjectActivity,
  ProjectActivityPaginationMeta,
} from '../../models/project-activity.model';
import {
  Project,
} from '../../models/project.model';
import {
  ProjectActivityService,
} from '../../services/project-activity.service';

@Component({
  selector: 'app-project-activity-modal',
  standalone: true,
  templateUrl:
    './project-activity-modal.component.html',
  styleUrl:
    './project-activity-modal.component.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    UserAvatarComponent,
  ],
})
export class ProjectActivityModalComponent
  implements OnInit {

  @Input({
    required: true,
  })
  workspaceId!: number;

  @Input({
    required: true,
  })
  project!: Project;

  private readonly modalController =
    inject(ModalController);

  private readonly projectActivityService =
    inject(ProjectActivityService);

  private readonly destroyRef =
    inject(DestroyRef);

  activities: ProjectActivity[] = [];

  pagination:
    ProjectActivityPaginationMeta | null =
    null;

  isLoading = true;

  isLoadingMore = false;

  errorMessage = '';

  readonly perPage = 20;

  constructor() {
    addIcons({
      closeOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.loadActivities(true);
  }

  get hasMoreActivities(): boolean {
    return (
      this.pagination
        ?.has_more_pages ?? false
    );
  }

  get totalActivities(): number {
    return (
      this.pagination?.total ??
      this.activities.length
    );
  }

  loadActivities(
    reset: boolean = true,
  ): void {
    if (
      this.isLoadingMore ||
      (
        !reset &&
        !this.hasMoreActivities
      )
    ) {
      return;
    }

    const page = reset
      ? 1
      : (
      this.pagination
        ?.current_page ?? 0
    ) + 1;

    if (reset) {
      this.isLoading = true;
      this.activities = [];
      this.pagination = null;
    } else {
      this.isLoadingMore = true;
    }

    this.errorMessage = '';

    this.projectActivityService
      .getActivities(
        this.workspaceId,
        this.project.id,
        page,
        this.perPage,
      )
      .pipe(
        finalize(() => {
          if (reset) {
            this.isLoading = false;
          } else {
            this.isLoadingMore = false;
          }
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          if (reset) {
            this.activities =
              response.data.activities;
          } else {
            this.activities = [
              ...this.activities,
              ...response.data.activities,
            ];
          }

          this.pagination =
            response.meta;
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 403) {
            this.errorMessage =
              'You do not have access to project activity.';

            return;
          }

          if (error.status === 404) {
            this.errorMessage =
              'Project activity could not be found.';

            return;
          }

          this.errorMessage =
            'Unable to load project activity. Please try again.';
        },
      });
  }

  getActivityActorName(
    activity: ProjectActivity,
  ): string {
    return (
      activity.actor?.name ??
      'System'
    );
  }

  getActivityText(
    activity: ProjectActivity,
  ): string {
    const label =
      activity.subject_label?.trim();

    switch (activity.type) {
      case 'project_created':
        return 'created this project';

      case 'project_updated':
        return 'updated project details';

      case 'project_member_added':
        return label
          ? `added ${label} to the project`
          : 'added a project member';

      case 'project_member_removed':
        return label
          ? `removed ${label} from the project`
          : 'removed a project member';

      case 'task_created':
        return label
          ? `created task “${label}”`
          : 'created a task';

      case 'task_updated':
        return label
          ? `updated task “${label}”`
          : 'updated a task';

      case 'task_status_changed':
        return label
          ? `changed the status of “${label}”`
          : 'changed a task status';

      case 'task_assignees_changed':
        return label
          ? `updated assignees on “${label}”`
          : 'updated task assignees';

      case 'task_deleted':
        return label
          ? `deleted task “${label}”`
          : 'deleted a task';

      case 'comment_created':
        return 'added a comment';

      case 'comment_updated':
        return 'edited a comment';

      case 'comment_deleted':
        return 'deleted a comment';

      case 'task_attachment_added':
        return label
          ? `added attachment “${label}”`
          : 'added a task attachment';

      case 'task_attachment_removed':
        return label
          ? `removed attachment “${label}”`
          : 'removed a task attachment';

      case 'comment_attachment_added':
        return label
          ? `added comment image “${label}”`
          : 'added a comment image';

      case 'comment_attachment_removed':
        return label
          ? `removed comment image “${label}”`
          : 'removed a comment image';

      default:
        return 'updated the project';
    }
  }

  getActivityDate(
    activity: ProjectActivity,
  ): string {
    const date =
      new Date(
        activity.created_at,
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return '';
    }

    return date.toLocaleString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      },
    );
  }

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }
}
