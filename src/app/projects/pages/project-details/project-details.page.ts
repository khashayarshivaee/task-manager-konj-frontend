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
  TaskCalendarModalComponent,
} from '../../../tasks/components/task-calendar-modal/task-calendar-modal.component';

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

  private readonly taskService =
    inject(TaskService);

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

  project: Project | null = null;
  tasks: ProjectTask[] = [];

  workspaceId = 0;
  projectId = 0;

  isLoading = true;
  isLoadingTasks = false;

  errorMessage = '';
  taskErrorMessage = '';

  taskStatusErrorMessage = '';

  private readonly updatingTaskStatusIds =
    new Set<number>();

  showUpdateNotice = false;
  showTaskCreatedNotice = false;

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
      timeOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
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

          this.loadTasks();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.project = null;
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

  loadTasks(): void {
    if (
      this.isLoadingTasks ||
      !this.project
    ) {
      return;
    }

    this.isLoadingTasks = true;
    this.taskErrorMessage = '';

    this.taskService
      .getTasks(
        this.workspaceId,
        this.projectId,
      )
      .pipe(
        finalize(() => {
          this.isLoadingTasks = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.tasks = this.sortTasks(
            response.data.tasks,
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.tasks = [];

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

          this.taskErrorMessage =
            'Unable to load project tasks. Please try again.';
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
      this.tasks = this.sortTasks(
        this.tasks.map(
          (currentTask) =>
            currentTask.id === result.data?.id
              ? result.data
              : currentTask,
        ),
      );
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
      this.tasks = this.tasks.filter(
        (currentTask) =>
          currentTask.id !== result.data?.id,
      );
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
      this.tasks = this.sortTasks([
        ...this.tasks,
        result.data,
      ]);

      this.showTaskCreatedNotice = true;
    }
  }

  async openTaskCalendar(): Promise<void> {
    const modal =
      await this.modalController.create({
        component:
        TaskCalendarModalComponent,

        componentProps: {
          tasks: this.tasks,
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

  get progressTasks(): ProjectTask[] {
    if (
      this.projectProgressPeriod === 'all'
    ) {
      return this.tasks;
    }

    const range =
      this.getProjectProgressDateRange();

    if (!range) {
      return this.tasks;
    }

    return this.tasks.filter((task) => {
      const dueDate =
        this.parseTaskDate(task.due_at);

      if (!dueDate) {
        return false;
      }

      return (
        dueDate >= range.start &&
        dueDate <= range.end
      );
    });
  }
  get visibleTasks(): ProjectTask[] {
    return this.progressTasks;
  }

  get totalTaskCount(): number {
    return this.progressTasks.length;
  }

  get completedTaskCount(): number {
    return this.countProgressTasksByStatus(
      'completed',
    );
  }

  get backlogTaskCount(): number {
    return this.countProgressTasksByStatus(
      'backlog',
    );
  }

  get todoTaskCount(): number {
    return this.countProgressTasksByStatus(
      'todo',
    );
  }

  get inProgressTaskCount(): number {
    return this.countProgressTasksByStatus(
      'in_progress',
    );
  }

  get inReviewTaskCount(): number {
    return this.countProgressTasksByStatus(
      'in_review',
    );
  }

  get remainingTaskCount(): number {
    return Math.max(
      this.totalTaskCount -
      this.completedTaskCount,
      0,
    );
  }

  get projectProgressPercentage(): number {
    if (this.totalTaskCount === 0) {
      return 0;
    }

    return Math.round(
      (
        this.completedTaskCount /
        this.totalTaskCount
      ) * 100,
    );
  }

  get tasksWithoutDueDateCount(): number {
    return this.tasks.filter(
      (task) => !task.due_at,
    ).length;
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

  changeProjectProgressPeriod(
    event: Event,
  ): void {
    const select = event.target;

    if (
      !(select instanceof HTMLSelectElement)
    ) {
      return;
    }

    this.projectProgressPeriod =
      select.value as ProjectProgressPeriod;
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

  private countProgressTasksByStatus(
    status: TaskStatus,
  ): number {
    return this.progressTasks.filter(
      (task) => task.status === status,
    ).length;
  }

  private parseTaskDate(
    value: string | null,
  ): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(
      `${value.substring(0, 10)}T00:00:00`,
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  private getProjectProgressDateRange(): {
    start: Date;
    end: Date;
  } | null {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const end = new Date(start);

    if (
      this.projectProgressPeriod ===
      'this_week'
    ) {
      const day =
        start.getDay() === 0
          ? 7
          : start.getDay();

      start.setDate(
        start.getDate() - day + 1,
      );

      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return {
        start,
        end,
      };
    }

    if (
      this.projectProgressPeriod ===
      'this_month'
    ) {
      start.setDate(1);

      end.setFullYear(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
      );

      end.setHours(23, 59, 59, 999);

      return {
        start,
        end,
      };
    }

    if (
      this.projectProgressPeriod ===
      'this_year'
    ) {
      start.setMonth(0, 1);

      end.setFullYear(
        start.getFullYear(),
        11,
        31,
      );

      end.setHours(23, 59, 59, 999);

      return {
        start,
        end,
      };
    }

    return null;
  }
}
