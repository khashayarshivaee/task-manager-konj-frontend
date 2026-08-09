import {
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
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
  alertCircleOutline,
  arrowBackOutline,
  calendarOutline,
  checkmarkCircleOutline,
  flagOutline,
  folderOpenOutline,
  listOutline,
  personCircleOutline,
  searchOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  RealtimeService,
} from '../../../core/services/realtime.service';

import {
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';

import {
  Workspace,
} from '../../../workspaces/models/workspace.model';

import {
  WorkspaceService,
} from '../../../workspaces/services/workspace.service';

import {
  ProjectTask,
  TaskDueFilter,
  TaskPaginationMeta,
  TaskPriority,
  TaskStatus,
  TaskUser,
} from '../../models/task.model';

import {
  TaskService,
} from '../../services/task.service';

import {
  TaskDetailsModalComponent,
} from '../../components/task-details-modal/task-details-modal.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  templateUrl: './tasks.page.html',
  styleUrl: './tasks.page.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    UserAvatarComponent,
  ],
})
export class TasksPage implements OnInit {
  private readonly workspaceService =
    inject(WorkspaceService);

  private readonly taskService =
    inject(TaskService);

  private readonly realtimeService =
    inject(RealtimeService);

  private readonly modalController =
    inject(ModalController);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

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

  activeWorkspace: Workspace | null = null;

  tasks: ProjectTask[] = [];

  taskPagination:
    TaskPaginationMeta | null = null;

  readonly tasksPerPage = 20;

  taskSearchDraft = '';
  taskSearch = '';

  taskStatusFilter:
    TaskStatus | '' = '';

  taskPriorityFilter:
    TaskPriority | '' = '';

  taskDueFilter:
    TaskDueFilter | '' = '';

  taskAssignedToMeOnly = false;

  isLoadingWorkspace = true;
  isLoadingTasks = false;
  isLoadingMoreTasks = false;

  workspaceErrorMessage = '';
  taskErrorMessage = '';
  taskStatusErrorMessage = '';

  private readonly updatingTaskStatusIds =
    new Set<number>();

  constructor() {
    addIcons({
      alertCircleOutline,
      arrowBackOutline,
      calendarOutline,
      checkmarkCircleOutline,
      flagOutline,
      folderOpenOutline,
      listOutline,
      personCircleOutline,
      searchOutline,
    });
  }

  ngOnInit(): void {
    this.subscribeToUnreadCommentUpdates();
    this.loadWorkspace();
  }

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

  get hasTaskFilters(): boolean {
    return (
      this.taskSearch !== '' ||
      this.taskStatusFilter !== '' ||
      this.taskPriorityFilter !== '' ||
      this.taskDueFilter !== '' ||
      this.taskAssignedToMeOnly
    );
  }

  get activeTaskFilterCount(): number {
    return [
      this.taskSearch !== '',
      this.taskStatusFilter !== '',
      this.taskPriorityFilter !== '',
      this.taskDueFilter !== '',
      this.taskAssignedToMeOnly,
    ].filter(Boolean).length;
  }

  private loadWorkspace(): void {
    this.isLoadingWorkspace = true;
    this.workspaceErrorMessage = '';

    this.workspaceService
      .loadWorkspaces()
      .pipe(
        finalize(() => {
          this.isLoadingWorkspace =
            false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: () => {
          this.activeWorkspace =
            this.workspaceService
              .getActiveWorkspace();

          if (
            this.activeWorkspace
          ) {
            this.loadTasks(true);
          }
        },

        error: () => {
          this.activeWorkspace = null;

          this.workspaceErrorMessage =
            'Unable to load the active workspace.';
        },
      });
  }

  loadTasks(
    reset: boolean = true,
  ): void {
    const workspace =
      this.activeWorkspace;

    if (
      !workspace ||
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
      .getWorkspaceTasks(
        workspace.id,
        {
          page,
          per_page:
          this.tasksPerPage,

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
            this.taskDueFilter ||
            undefined,

          sort: 'workflow',
          direction: 'asc',
        },
      )
      .pipe(
        finalize(() => {
          if (reset) {
            this.isLoadingTasks =
              false;
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
          if (reset) {
            this.tasks =
              response.data.tasks;
          } else {
            this.tasks = [
              ...this.tasks,
              ...response.data.tasks,
            ];
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
              'You do not have access to tasks in this workspace.';

            return;
          }

          if (error.status === 422) {
            this.taskErrorMessage =
              'The selected task filters are invalid.';

            return;
          }

          this.taskErrorMessage =
            reset
              ? 'Unable to load workspace tasks. Please try again.'
              : 'Unable to load more tasks. Please try again.';
        },
      });
  }

  loadMoreTasks(): void {
    this.loadTasks(false);
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

    if (
      search ===
      this.taskSearch
    ) {
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
      !(select instanceof
        HTMLSelectElement)
    ) {
      return;
    }

    this.taskPriorityFilter =
      select.value as
        TaskPriority | '';

    this.reloadTasksForFilterChange();
  }

  setTaskDueFilter(
    event: Event,
  ): void {
    const select = event.target;

    if (
      !(select instanceof
        HTMLSelectElement)
    ) {
      return;
    }

    this.taskDueFilter =
      select.value as
        TaskDueFilter | '';

    this.reloadTasksForFilterChange();
  }

  clearTaskFilters(): void {
    this.taskSearchDraft = '';
    this.taskSearch = '';

    this.taskStatusFilter = '';
    this.taskPriorityFilter = '';
    this.taskDueFilter = '';

    this.taskAssignedToMeOnly =
      false;

    this.reloadTasksForFilterChange();
  }

  private reloadTasksForFilterChange(): void {
    this.tasks = [];
    this.taskPagination = null;

    this.loadTasks(true);
  }

  async openTaskDetails(
    task: ProjectTask,
  ): Promise<void> {
    const workspace =
      this.activeWorkspace;

    if (!workspace) {
      return;
    }

    const modal =
      await this.modalController.create({
        component:
        TaskDetailsModalComponent,

        componentProps: {
          workspaceId:
          workspace.id,

          projectId:
          task.project_id,

          taskId:
          task.id,
        },

        cssClass:
          'project-create-modal',

        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<
        ProjectTask
      >();

    if (
      result.role === 'closed' ||
      result.role === 'deleted'
    ) {
      this.loadTasks(true);
    }
  }

  openProject(
    task: ProjectTask,
    event: MouseEvent,
  ): void {
    event.stopPropagation();

    const workspace =
      this.activeWorkspace;

    if (!workspace) {
      return;
    }

    void this.router.navigate([
      '/workspaces',
      workspace.id,
      'projects',
      task.project_id,
    ]);
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
    const nextStatus:
      TaskStatus =
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
      !(select instanceof
        HTMLSelectElement)
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

  private saveTaskStatus(
    task: ProjectTask,
    status: TaskStatus,
    statusSelect?:
      HTMLSelectElement,
  ): void {
    const workspace =
      this.activeWorkspace;

    if (
      !workspace ||
      this.isTaskStatusUpdating(
        task.id,
      )
    ) {
      if (statusSelect) {
        statusSelect.value =
          task.status;
      }

      return;
    }

    if (status === task.status) {
      return;
    }

    const previousStatus =
      task.status;

    this.taskStatusErrorMessage =
      '';

    this.updatingTaskStatusIds.add(
      task.id,
    );

    this.taskService
      .updateTaskStatus(
        workspace.id,
        task.project_id,
        task.id,
        {
          status,
        },
      )
      .pipe(
        finalize(() => {
          this.updatingTaskStatusIds
            .delete(task.id);
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          const updatedTask =
            response.data.task;

          this.tasks =
            this.tasks.map(
              (currentTask) => {
                if (
                  currentTask.id !==
                  updatedTask.id
                ) {
                  return currentTask;
                }

                return {
                  ...updatedTask,

                  project:
                  currentTask.project,
                };
              },
            );
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          if (statusSelect) {
            statusSelect.value =
              previousStatus;
          }

          if (
            error.status === 403
          ) {
            this.taskStatusErrorMessage =
              'You do not have permission to update this task.';

            return;
          }

          if (
            error.status === 404
          ) {
            this.taskStatusErrorMessage =
              'This task could not be found.';

            return;
          }

          if (
            error.status === 422
          ) {
            this.taskStatusErrorMessage =
              'The selected task status is invalid.';

            return;
          }

          this.taskStatusErrorMessage =
            'Task status could not be updated. Please try again.';
        },
      });
  }

  getTaskPriorityLabel(
    priority:
      ProjectTask['priority'],
  ): string {
    return (
      priority
        .charAt(0)
        .toUpperCase() +
      priority.slice(1)
    );
  }

  getTaskStatusLabel(
    status:
      ProjectTask['status'],
  ): string {
    return status
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (
          character: string,
        ) =>
          character.toUpperCase(),
      );
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
    return this
      .getTaskAssignees(task)
      .slice(0, 3);
  }

  getHiddenTaskAssigneeCount(
    task: ProjectTask,
  ): number {
    return Math.max(
      this
        .getTaskAssignees(task)
        .length - 3,
      0,
    );
  }

  getTaskAssigneeSummary(
    task: ProjectTask,
  ): string {
    const assignees =
      this.getTaskAssignees(
        task,
      );

    if (
      assignees.length === 0
    ) {
      return 'Unassigned';
    }

    if (
      assignees.length === 1
    ) {
      return assignees[0].name;
    }

    return `${assignees.length} assignees`;
  }

  getTaskAssigneeTitle(
    task: ProjectTask,
  ): string {
    const assignees =
      this.getTaskAssignees(
        task,
      );

    if (
      assignees.length === 0
    ) {
      return 'Unassigned';
    }

    return assignees
      .map(
        (assignee) =>
          assignee.name,
      )
      .join(', ');
  }

  formatDate(
    value: string | null,
  ): string {
    if (!value) {
      return 'Not set';
    }

    const date = new Date(
      `${value.substring(
        0,
        10,
      )}T00:00:00`,
    );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
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

  goHome(): void {
    void this.router.navigateByUrl(
      '/home',
    );
  }

  openWorkspaces(): void {
    void this.router.navigateByUrl(
      '/workspaces',
    );
  }

  private subscribeToUnreadCommentUpdates(): void {
    this.realtimeService
      .unreadCommentsUpdated$
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((event) => {
        const workspace =
          this.activeWorkspace;

        if (
          !workspace ||
          event.workspace_id !==
          workspace.id
        ) {
          return;
        }

        const taskExists =
          this.tasks.some(
            (task) =>
              task.id ===
              event.task_id,
          );

        if (!taskExists) {
          return;
        }

        this.tasks =
          this.tasks.map(
            (task) => {
              if (
                task.id !==
                event.task_id
              ) {
                return task;
              }

              return {
                ...task,

                unread_comments_count:
                event
                  .unread_comments_count,
              };
            },
          );
      });
  }
}
