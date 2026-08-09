import {
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';

import {
  ProjectMember,
} from '../../models/project-member.model';

import {
  ProjectActivityModalComponent,
} from '../../components/project-activity-modal/project-activity-modal.component';

import {
  ProjectActivity,
  ProjectActivityPaginationMeta,
} from '../../models/project-activity.model';

import {
  ProjectActivityService,
} from '../../services/project-activity.service';

import {
  ManageProjectMembersModalComponent,
} from '../../components/manage-project-members-modal/manage-project-members-modal.component';

import {
  ProjectMemberService,
} from '../../services/project-member.service';
import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  TaskCalendarModalComponent,
} from '../../../tasks/components/task-calendar-modal/task-calendar-modal.component';

import {
  RealtimeService,
} from '../../../core/services/realtime.service';

import {
  TaskDetailsModalComponent,
} from '../../../tasks/components/task-details-modal/task-details-modal.component';

import {
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
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
  addOutline,
  arrowBackOutline,
  alertCircleOutline,
  calendarOutline,
  checkmarkCircleOutline,
  createOutline,
  flagOutline,
  folderOpenOutline,
  listOutline,
  personCircleOutline,
  searchOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  CreateTaskModalComponent,
} from '../../../tasks/components/create-task-modal/create-task-modal.component';

import {
  ProjectTask,
  ProjectTaskSummary,
  TaskPaginationMeta,
  TaskPriority,
  TaskStatus,
  TaskUser,
} from '../../../tasks/models/task.model';
import {
  TaskService,
} from '../../../tasks/services/task.service';
import {
  DeleteProjectModalComponent,
} from '../../components/delete-project-modal/delete-project-modal.component';
import {
  EditProjectModalComponent,
} from '../../components/edit-project-modal/edit-project-modal.component';
import {
  Project,
} from '../../models/project.model';
import {
  ProjectService,
} from '../../services/project.service';

type ProjectProgressPeriod =
  | 'all'
  | 'this_week'
  | 'this_month'
  | 'this_year';

@Component({
  selector: 'app-project-details',
  standalone: true,
  templateUrl: './project-details.page.html',
  styleUrl: './project-details.page.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    UserAvatarComponent,
  ],
})



export class ProjectDetailsPage implements OnInit {
  private readonly activatedRoute =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly modalController =
    inject(ModalController);

  private readonly projectService =
    inject(ProjectService);

  private readonly projectActivityService =
    inject(ProjectActivityService);

  private readonly projectMemberService =
    inject(ProjectMemberService);

  private readonly taskService =
    inject(TaskService);

  private readonly realtimeService =
    inject(RealtimeService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly taskStatusOrder:
    Record<ProjectTask['status'], number> = {
    backlog: 0,
    todo: 1,
    in_progress: 2,
    in_review: 3,
    completed: 4,
  };

  readonly taskStatusOptions:
    ReadonlyArray<{
      value: TaskStatus;
      label: string;
    }> = [
    {
      value: 'backlog',
      label: 'Backlog',
    },
    {
      value: 'todo',
      label: 'Todo',
    },
    {
      value: 'in_progress',
      label: 'In progress',
    },
    {
      value: 'in_review',
      label: 'In review',
    },
    {
      value: 'completed',
      label: 'Completed',
    },
  ];

  readonly projectProgressPeriodOptions:
    ReadonlyArray<{
      value: ProjectProgressPeriod;
      label: string;
    }> = [
    {
      value: 'all',
      label: 'All time',
    },
    {
      value: 'this_week',
      label: 'This week',
    },
    {
      value: 'this_month',
      label: 'This month',
    },
    {
      value: 'this_year',
      label: 'This year',
    },
  ];

  projectProgressPeriod:
    ProjectProgressPeriod = 'all';

  taskSearchDraft = '';
  taskSearch = '';

  taskStatusFilter:
    TaskStatus | '' = '';

  taskPriorityFilter:
    TaskPriority | '' = '';

  taskAssignedToMeOnly = false;

  project: Project | null = null;

  projectMembers: ProjectMember[] = [];

  projectActivities: ProjectActivity[] = [];

  projectActivityPagination:
    ProjectActivityPaginationMeta | null =
    null;

  tasks: ProjectTask[] = [];

  taskSummary: ProjectTaskSummary | null =
    null;

  taskPagination: TaskPaginationMeta | null =
    null;

  readonly tasksPerPage = 20;

  workspaceId = 0;
  projectId = 0;

  isLoading = true;

  isLoadingProjectMembers = false;
  isLoadingProjectActivities = false;
  isLoadingTasks = false;
  isLoadingMoreTasks = false;
  isLoadingTaskSummary = false;

  errorMessage = '';
  projectMembersErrorMessage = '';
  projectActivitiesErrorMessage = '';
  taskErrorMessage = '';

  taskStatusErrorMessage = '';

  taskSummaryErrorMessage = '';

  private readonly updatingTaskStatusIds =
    new Set<number>();

  showUpdateNotice = false;
  showTaskCreatedNotice = false;

  get hasMoreTasks(): boolean {
    return (
      this.taskPagination
        ?.has_more_pages ?? false
    );
  }

  get loadedTaskCount(): number {
    return this.tasks.length;
  }

  get filteredTaskTotal(): number {
    return (
      this.taskPagination?.total ??
      this.tasks.length
    );
  }

  get visibleProjectMembers(): ProjectMember[] {
    return this.projectMembers.slice(
      0,
      5,
    );
  }

  get hiddenProjectMemberCount(): number {
    return Math.max(
      this.projectMembers.length - 5,
      0,
    );
  }

  get visibleProjectActivities(): ProjectActivity[] {
    return this.projectActivities.slice(
      0,
      3,
    );
  }
  get projectActivityTotal(): number {
    return (
      this.projectActivityPagination?.total ??
      this.projectActivities.length
    );
  }
  getProjectActivityText(
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

  getProjectActivityActorName(
    activity: ProjectActivity,
  ): string {
    return (
      activity.actor?.name ??
      'System'
    );
  }

  getProjectActivityTime(
    activity: ProjectActivity,
  ): string {
    const createdAt =
      new Date(activity.created_at);

    if (
      Number.isNaN(
        createdAt.getTime(),
      )
    ) {
      return '';
    }

    const difference =
      Date.now() -
      createdAt.getTime();

    const minute =
      60 * 1000;

    const hour =
      60 * minute;

    const day =
      24 * hour;

    if (difference < minute) {
      return 'Just now';
    }

    if (difference < hour) {
      const minutes =
        Math.floor(
          difference / minute,
        );

      return `${minutes}m ago`;
    }

    if (difference < day) {
      const hours =
        Math.floor(
          difference / hour,
        );

      return `${hours}h ago`;
    }

    if (difference < 7 * day) {
      const days =
        Math.floor(
          difference / day,
        );

      return `${days}d ago`;
    }

    return createdAt.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      },
    );
  }

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      calendarOutline,
      checkmarkCircleOutline,
      createOutline,
      flagOutline,
      alertCircleOutline,
      folderOpenOutline,
      listOutline,
      personCircleOutline,
      searchOutline,
      timeOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    this.subscribeToUnreadCommentUpdates();
    this.workspaceId = Number(
      this.activatedRoute.snapshot.paramMap.get(
        'workspaceId',
      ),
    );

    this.projectId = Number(
      this.activatedRoute.snapshot.paramMap.get(
        'projectId',
      ),
    );

    if (
      !Number.isInteger(this.workspaceId) ||
      !Number.isInteger(this.projectId) ||
      this.workspaceId <= 0 ||
      this.projectId <= 0
    ) {
      this.isLoading = false;
      this.errorMessage =
        'The requested project address is invalid.';

      return;
    }

    this.loadProject();
  }

  loadProject(): void {
    if (this.isLoading && this.project) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.projectService
      .getProject(
        this.workspaceId,
        this.projectId,
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.project =
            response.data.project;

          this.loadProjectMembers();
          this.loadProjectActivities();

          this.loadTasks(true);
          this.loadTaskSummary();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.project = null;
          this.projectMembers = [];
          this.projectActivities = [];
          this.projectActivityPagination = null;
          this.tasks = [];

          if (error.status === 403) {
            this.errorMessage =
              'You do not have access to this project.';

            return;
          }

          if (error.status === 404) {
            this.errorMessage =
              'This project could not be found in the selected workspace.';

            return;
          }

          this.errorMessage =
            'Unable to load the project. Please try again.';
        },
      });
  }

  loadProjectMembers(): void {
    if (
      !this.project ||
      this.isLoadingProjectMembers
    ) {
      return;
    }

    this.isLoadingProjectMembers = true;
    this.projectMembersErrorMessage = '';

    this.projectMemberService
      .getMembers(
        this.workspaceId,
        this.projectId,
      )
      .pipe(
        finalize(() => {
          this.isLoadingProjectMembers =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (members) => {
          this.projectMembers = members;
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.projectMembers = [];

          if (error.status === 403) {
            this.projectMembersErrorMessage =
              'You do not have access to the project members.';

            return;
          }

          if (error.status === 404) {
            this.projectMembersErrorMessage =
              'The project members could not be found.';

            return;
          }

          this.projectMembersErrorMessage =
            'Unable to load project members. Please try again.';
        },
      });
  }

  loadProjectActivities(): void {
    if (
      !this.project ||
      this.isLoadingProjectActivities
    ) {
      return;
    }

    this.isLoadingProjectActivities = true;
    this.projectActivitiesErrorMessage = '';

    this.projectActivityService
      .getActivities(
        this.workspaceId,
        this.projectId,
        1,
        5,
      )
      .pipe(
        finalize(() => {
          this.isLoadingProjectActivities =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          this.projectActivities =
            response.data.activities;

          this.projectActivityPagination =
            response.meta;
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.projectActivities = [];
          this.projectActivityPagination =
            null;

          if (error.status === 403) {
            this.projectActivitiesErrorMessage =
              'You do not have access to project activity.';

            return;
          }

          if (error.status === 404) {
            this.projectActivitiesErrorMessage =
              'Project activity could not be found.';

            return;
          }

          this.projectActivitiesErrorMessage =
            'Unable to load project activity. Please try again.';
        },
      });
  }

  loadTasks(
    reset: boolean = true,
  ): void {
    if (
      !this.project ||
      this.isLoadingTasks ||
      this.isLoadingMoreTasks
    ) {
      return;
    }

    if (
      !reset &&
      !this.hasMoreTasks
    ) {
      return;
    }

    const page = reset
      ? 1
      : (
      this.taskPagination
        ?.current_page ?? 0
    ) + 1;

    if (reset) {
      this.isLoadingTasks = true;
      this.taskErrorMessage = '';
    } else {
      this.isLoadingMoreTasks = true;
    }

    this.taskService
      .getTasks(
        this.workspaceId,
        this.projectId,
        {
          page,
          per_page: this.tasksPerPage,

          search:
            this.taskSearch ||
            undefined,

          status:
            this.taskStatusFilter ||
            undefined,

          priority:
            this.taskPriorityFilter ||
            undefined,

          assignee:
            this.taskAssignedToMeOnly
              ? 'me'
              : undefined,

          due:
            this.projectProgressPeriod ===
            'all'
              ? undefined
              : this.projectProgressPeriod,

          sort: 'workflow',
          direction: 'asc',
        },
      )
      .pipe(
        finalize(() => {
          if (reset) {
            this.isLoadingTasks = false;
          } else {
            this.isLoadingMoreTasks =
              false;
          }
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          const receivedTasks =
            response.data.tasks;

          if (reset) {
            this.tasks = this.sortTasks(
              receivedTasks,
            );
          } else {
            const existingTaskIds =
              new Set(
                this.tasks.map(
                  (task) => task.id,
                ),
              );

            const newTasks =
              receivedTasks.filter(
                (task) =>
                  !existingTaskIds.has(
                    task.id,
                  ),
              );

            this.tasks = this.sortTasks([
              ...this.tasks,
              ...newTasks,
            ]);
          }

          this.taskPagination =
            response.meta;
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (reset) {
            this.tasks = [];
            this.taskPagination = null;
          }

          if (error.status === 403) {
            this.taskErrorMessage =
              'You do not have access to the tasks in this project.';

            return;
          }

          if (error.status === 404) {
            this.taskErrorMessage =
              'The project task list could not be found.';

            return;
          }

          if (error.status === 422) {
            this.taskErrorMessage =
              'The selected task filters are invalid.';

            return;
          }

          this.taskErrorMessage =
            reset
              ? 'Unable to load project tasks. Please try again.'
              : 'Unable to load more tasks. Please try again.';
        },
      });
  }
  loadMoreTasks(): void {
    this.loadTasks(false);
  }
  loadTaskSummary(): void {
    if (
      !this.project ||
      this.isLoadingTaskSummary
    ) {
      return;
    }

    this.isLoadingTaskSummary = true;
    this.taskSummaryErrorMessage = '';

    this.taskService
      .getTaskSummary(
        this.workspaceId,
        this.projectId,
        this.projectProgressPeriod,
      )
      .pipe(
        finalize(() => {
          this.isLoadingTaskSummary =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          this.taskSummary =
            response.data;
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 403) {
            this.taskSummaryErrorMessage =
              'You do not have access to the project task summary.';

            return;
          }

          if (error.status === 404) {
            this.taskSummaryErrorMessage =
              'The project task summary could not be found.';

            return;
          }

          this.taskSummaryErrorMessage =
            'Unable to load project progress.';
        },
      });
  }

  async openTaskDetails(
    task: ProjectTask,
  ): Promise<void> {
    const modal =
      await this.modalController.create({
        component:
        TaskDetailsModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          projectId: this.projectId,
          taskId: task.id,
        },

        cssClass: 'project-create-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<ProjectTask>();

    if (
      result.role === 'closed' &&
      result.data
    ) {
      this.loadTasks(true);
      this.loadTaskSummary();
    }

    if (
      result.role === 'edit' &&
      result.data
    ) {
      console.log(
        'Edit task requested:',
        result.data,
      );
    }

    if (
      result.role === 'deleted' &&
      result.data
    ) {
      this.loadTasks(true);
      this.loadTaskSummary();
    }
  }

  async openCreateTaskModal(): Promise<void> {
    if (!this.project) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        CreateTaskModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          projectId: this.projectId,
        },

        cssClass: 'project-create-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<ProjectTask>();

    if (
      result.role === 'created' &&
      result.data
    ) {
      this.showTaskCreatedNotice = true;

      this.loadTasks(true);
      this.loadTaskSummary();
    }
  }

  async openTaskCalendar(): Promise<void> {
    const modal =
      await this.modalController.create({
        component:
        TaskCalendarModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          projectId: this.projectId,
        },

        cssClass:
          'task-calendar-modal',

        backdropDismiss: true,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<ProjectTask>();

    if (
      result.role === 'task' &&
      result.data
    ) {
      await this.openTaskDetails(
        result.data,
      );
    }
  }

  async openProjectActivityModal(): Promise<void> {
    if (!this.project) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        ProjectActivityModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          project: this.project,
        },

        cssClass: 'project-create-modal',
      });

    await modal.present();
  }

  async openProjectMembersModal(): Promise<void> {
    if (!this.project) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        ManageProjectMembersModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          project: this.project,
        },

        cssClass: 'project-create-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<
        ProjectMember[]
      >();

    if (
      result.role === 'members-updated' &&
      result.data
    ) {
      this.projectMembers =
        result.data;
    }
  }

  async openEditProjectModal(): Promise<void> {
    if (!this.project) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        EditProjectModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          project: this.project,
        },

        cssClass: 'project-create-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<Project>();

    if (
      result.role === 'updated' &&
      result.data
    ) {
      this.project = result.data;
      this.showUpdateNotice = true;
    }
  }

  async openDeleteProjectModal(): Promise<void> {
    if (!this.project) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        DeleteProjectModalComponent,

        componentProps: {
          workspaceId: this.workspaceId,
          project: this.project,
        },

        cssClass: 'project-delete-modal',
        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<number>();

    if (result.role === 'deleted') {
      await this.router.navigateByUrl(
        '/home',
        {
          replaceUrl: true,
        },
      );
    }
  }

  goBack(): void {
    void this.router.navigateByUrl('/home');
  }

  getStatusLabel(
    status: Project['status'],
  ): string {
    return status
      .replace('_', ' ')
      .replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      );
  }

  getTaskStatusLabel(
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

  // get progressTasks(): ProjectTask[] {
  //   if (
  //     this.projectProgressPeriod === 'all'
  //   ) {
  //     return this.tasks;
  //   }
  //
  //   const range =
  //     this.getProjectProgressDateRange();
  //
  //   if (!range) {
  //     return this.tasks;
  //   }
  //
  //   return this.tasks.filter((task) => {
  //     const dueDate =
  //       this.parseTaskDate(task.due_at);
  //
  //     if (!dueDate) {
  //       return false;
  //     }
  //
  //     return (
  //       dueDate >= range.start &&
  //       dueDate <= range.end
  //     );
  //   });
  // }
  get visibleTasks(): ProjectTask[] {
    return this.tasks;
  }

  get totalTaskCount(): number {
    return this.taskSummary?.total ?? 0;
  }

  get completedTaskCount(): number {
    return (
      this.taskSummary?.completed ?? 0
    );
  }

  get backlogTaskCount(): number {
    return (
      this.taskSummary
        ?.by_status.backlog ?? 0
    );
  }

  get todoTaskCount(): number {
    return (
      this.taskSummary
        ?.by_status.todo ?? 0
    );
  }

  get inProgressTaskCount(): number {
    return (
      this.taskSummary
        ?.by_status.in_progress ?? 0
    );
  }

  get inReviewTaskCount(): number {
    return (
      this.taskSummary
        ?.by_status.in_review ?? 0
    );
  }

  get remainingTaskCount(): number {
    return (
      this.taskSummary?.remaining ?? 0
    );
  }

  get projectProgressPercentage(): number {
    return (
      this.taskSummary
        ?.completion_percentage ?? 0
    );
  }

  get tasksWithoutDueDateCount(): number {
    return (
      this.taskSummary
        ?.without_due_date ?? 0
    );
  }

  get selectedProgressPeriodLabel(): string {
    return (
      this.projectProgressPeriodOptions.find(
        (option) =>
          option.value ===
          this.projectProgressPeriod,
      )?.label ?? 'All time'
    );
  }
  get hasTaskFilters(): boolean {
    return (
      this.taskSearch !== '' ||
      this.taskStatusFilter !== '' ||
      this.taskPriorityFilter !== '' ||
      this.taskAssignedToMeOnly
    );
  }

  get activeTaskFilterCount(): number {
    return [
      this.taskSearch !== '',
      this.taskStatusFilter !== '',
      this.taskPriorityFilter !== '',
      this.taskAssignedToMeOnly,
    ].filter(Boolean).length;
  }

  onTaskSearchInput(
    event: Event,
  ): void {
    this.taskSearchDraft =
      (
        event.target as HTMLInputElement
      ).value;
  }

  applyTaskSearch(): void {
    const search =
      this.taskSearchDraft.trim();

    if (search === this.taskSearch) {
      return;
    }

    this.taskSearch = search;

    this.reloadTasksForFilterChange();
  }

  setTaskStatusFilter(
    status: TaskStatus | '',
  ): void {
    if (
      this.taskStatusFilter === status
    ) {
      return;
    }

    this.taskStatusFilter = status;

    this.reloadTasksForFilterChange();
  }

  toggleTaskAssignedToMe(): void {
    this.taskAssignedToMeOnly =
      !this.taskAssignedToMeOnly;

    this.reloadTasksForFilterChange();
  }

  setTaskPriorityFilter(
    event: Event,
  ): void {
    const select = event.target;

    if (
      !(select instanceof HTMLSelectElement)
    ) {
      return;
    }

    this.taskPriorityFilter =
      select.value as TaskPriority | '';

    this.reloadTasksForFilterChange();
  }

  clearTaskFilters(): void {
    this.taskSearchDraft = '';
    this.taskSearch = '';
    this.taskStatusFilter = '';
    this.taskPriorityFilter = '';
    this.taskAssignedToMeOnly = false;

    this.reloadTasksForFilterChange();
  }

  private reloadTasksForFilterChange(): void {
    this.tasks = [];
    this.taskPagination = null;

    this.loadTasks(true);
  }

  changeProjectProgressPeriod(
    event: Event,
  ): void {
    const select = event.target;

    if (
      !(select instanceof
        HTMLSelectElement)
    ) {
      return;
    }

    this.projectProgressPeriod =
      select.value as ProjectProgressPeriod;

    this.tasks = [];
    this.taskPagination = null;

    this.loadTasks(true);
    this.loadTaskSummary();
  }

  isTaskStatusUpdating(
    taskId: number,
  ): boolean {
    return this.updatingTaskStatusIds.has(
      taskId,
    );
  }

  toggleTaskCompleted(
    task: ProjectTask,
  ): void {
    const nextStatus: TaskStatus =
      task.status === 'completed'
        ? 'todo'
        : 'completed';

    this.saveTaskStatus(
      task,
      nextStatus,
    );
  }

  changeTaskStatus(
    task: ProjectTask,
    event: Event,
  ): void {
    const select = event.target;

    if (
      !(select instanceof HTMLSelectElement)
    ) {
      return;
    }

    const status =
      select.value as TaskStatus;

    this.saveTaskStatus(
      task,
      status,
      select,
    );
  }

  getTaskPriorityLabel(
    priority: ProjectTask['priority'],
  ): string {
    return priority
        .charAt(0)
        .toUpperCase() +
      priority.slice(1);
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

  getVisibleTaskAssignees(
    task: ProjectTask,
  ): TaskUser[] {
    return this.getTaskAssignees(
      task,
    ).slice(0, 3);
  }

  getHiddenTaskAssigneeCount(
    task: ProjectTask,
  ): number {
    return Math.max(
      this.getTaskAssignees(task).length - 3,
      0,
    );
  }

  getTaskAssigneeSummary(
    task: ProjectTask,
  ): string {
    const assignees =
      this.getTaskAssignees(task);

    if (assignees.length === 0) {
      return 'Unassigned';
    }

    if (assignees.length === 1) {
      return assignees[0].name;
    }

    return `${assignees.length} assignees`;
  }

  getTaskAssigneeTitle(
    task: ProjectTask,
  ): string {
    const assignees =
      this.getTaskAssignees(task);

    if (assignees.length === 0) {
      return 'Unassigned';
    }

    return assignees
      .map((assignee) => assignee.name)
      .join(', ');
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

  private saveTaskStatus(
    task: ProjectTask,
    status: TaskStatus,
    statusSelect?: HTMLSelectElement,
  ): void {
    if (
      this.isTaskStatusUpdating(task.id)
    ) {
      if (statusSelect) {
        statusSelect.value = task.status;
      }

      return;
    }

    if (status === task.status) {
      return;
    }

    const previousStatus = task.status;

    this.taskStatusErrorMessage = '';

    this.updatingTaskStatusIds.add(
      task.id,
    );

    this.taskService
      .updateTaskStatus(
        this.workspaceId,
        this.projectId,
        task.id,
        {
          status,
        },
      )
      .pipe(
        finalize(() => {
          this.updatingTaskStatusIds.delete(
            task.id,
          );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const updatedTask =
            response.data.task;

          this.tasks = this.sortTasks(
            this.tasks.map(
              (currentTask) =>
                currentTask.id ===
                updatedTask.id
                  ? updatedTask
                  : currentTask,
            ),
          );
          this.loadTaskSummary();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (statusSelect) {
            statusSelect.value =
              previousStatus;
          }

          if (error.status === 403) {
            this.taskStatusErrorMessage =
              'You do not have permission to update this task.';

            return;
          }

          if (error.status === 404) {
            this.taskStatusErrorMessage =
              'This task could not be found.';

            return;
          }

          if (error.status === 422) {
            this.taskStatusErrorMessage =
              'The selected task status is invalid.';

            return;
          }

          this.taskStatusErrorMessage =
            'Task status could not be updated. Please try again.';
        },
      });
  }

  private sortTasks(
    tasks: ProjectTask[],
  ): ProjectTask[] {
    return [...tasks].sort(
      (
        firstTask,
        secondTask,
      ) => {
        const statusDifference =
          this.taskStatusOrder[
            firstTask.status
            ] -
          this.taskStatusOrder[
            secondTask.status
            ];

        if (statusDifference !== 0) {
          return statusDifference;
        }

        const positionDifference =
          firstTask.position -
          secondTask.position;

        if (positionDifference !== 0) {
          return positionDifference;
        }

        return secondTask.id - firstTask.id;
      },
    );
  }

  // private countProgressTasksByStatus(
  //   status: TaskStatus,
  // ): number {
  //   return this.progressTasks.filter(
  //     (task) => task.status === status,
  //   ).length;
  // }

  // private parseTaskDate(
  //   value: string | null,
  // ): Date | null {
  //   if (!value) {
  //     return null;
  //   }
  //
  //   const date = new Date(
  //     `${value.substring(0, 10)}T00:00:00`,
  //   );
  //
  //   return Number.isNaN(date.getTime())
  //     ? null
  //     : date;
  // }

  // private getProjectProgressDateRange(): {
  //   start: Date;
  //   end: Date;
  // } | null {
  //   const now = new Date();
  //
  //   const start = new Date(
  //     now.getFullYear(),
  //     now.getMonth(),
  //     now.getDate(),
  //   );
  //
  //   const end = new Date(start);
  //
  //   if (
  //     this.projectProgressPeriod ===
  //     'this_week'
  //   ) {
  //     const day =
  //       start.getDay() === 0
  //         ? 7
  //         : start.getDay();
  //
  //     start.setDate(
  //       start.getDate() - day + 1,
  //     );
  //
  //     end.setTime(start.getTime());
  //     end.setDate(end.getDate() + 6);
  //     end.setHours(23, 59, 59, 999);
  //
  //     return {
  //       start,
  //       end,
  //     };
  //   }
  //
  //   if (
  //     this.projectProgressPeriod ===
  //     'this_month'
  //   ) {
  //     start.setDate(1);
  //
  //     end.setFullYear(
  //       start.getFullYear(),
  //       start.getMonth() + 1,
  //       0,
  //     );
  //
  //     end.setHours(23, 59, 59, 999);
  //
  //     return {
  //       start,
  //       end,
  //     };
  //   }
  //
  //   if (
  //     this.projectProgressPeriod ===
  //     'this_year'
  //   ) {
  //     start.setMonth(0, 1);
  //
  //     end.setFullYear(
  //       start.getFullYear(),
  //       11,
  //       31,
  //     );
  //
  //     end.setHours(23, 59, 59, 999);
  //
  //     return {
  //       start,
  //       end,
  //     };
  //   }
  //
  //   return null;
  // }

  private subscribeToUnreadCommentUpdates(): void {
    this.realtimeService
      .unreadCommentsUpdated$
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((event) => {
        if (
          event.workspace_id !==
          this.workspaceId ||
          event.project_id !==
          this.projectId
        ) {
          return;
        }

        const taskExists =
          this.tasks.some(
            (task) =>
              task.id === event.task_id,
          );

        if (!taskExists) {
          return;
        }

        this.tasks =
          this.tasks.map((task) => {
            if (
              task.id !== event.task_id
            ) {
              return task;
            }

            return {
              ...task,

              unread_comments_count:
              event
                .unread_comments_count,
            };
          });
      });
  }
}
