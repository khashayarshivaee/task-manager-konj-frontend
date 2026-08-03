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
  TaskDetailsModalComponent,
} from '../../../tasks/components/task-details-modal/task-details-modal.component';
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

@Component({
  selector: 'app-project-details',
  standalone: true,
  templateUrl: './project-details.page.html',
  styleUrl: './project-details.page.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
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

  project: Project | null = null;
  tasks: ProjectTask[] = [];

  workspaceId = 0;
  projectId = 0;

  isLoading = true;
  isLoadingTasks = false;

  errorMessage = '';
  taskErrorMessage = '';

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

  getTaskPriorityLabel(
    priority: ProjectTask['priority'],
  ): string {
    return priority
        .charAt(0)
        .toUpperCase() +
      priority.slice(1);
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
}
