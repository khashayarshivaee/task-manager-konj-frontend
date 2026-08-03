import {
  Component,
  DestroyRef,
  Input,
  inject,
} from '@angular/core';
import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  FormsModule,
} from '@angular/forms';
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
  alertCircleOutline,
  closeOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  ProjectTask,
} from '../../models/task.model';
import {
  TaskService,
} from '../../services/task.service';

@Component({
  selector: 'app-delete-task-modal',
  standalone: true,
  templateUrl:
    './delete-task-modal.component.html',
  styleUrl:
    './delete-task-modal.component.scss',
  imports: [
    FormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class DeleteTaskModalComponent {
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
  task!: ProjectTask;

  private readonly modalController =
    inject(ModalController);

  private readonly taskService =
    inject(TaskService);

  private readonly destroyRef =
    inject(DestroyRef);

  confirmationValue = '';

  isDeleting = false;
  errorMessage = '';

  constructor() {
    addIcons({
      alertCircleOutline,
      closeOutline,
      trashOutline,
    });
  }

  get canDelete(): boolean {
    return (
      this.confirmationValue.trim() ===
      this.task.title
    );
  }

  close(): void {
    if (this.isDeleting) {
      return;
    }

    void this.modalController.dismiss(
      null,
      'cancelled',
    );
  }

  deleteTask(): void {
    if (
      this.isDeleting ||
      !this.canDelete
    ) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    this.taskService
      .deleteTask(
        this.workspaceId,
        this.projectId,
        this.task.id,
      )
      .pipe(
        finalize(() => {
          this.isDeleting = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          void this.modalController.dismiss(
            this.task.id,
            'deleted',
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 403) {
            this.errorMessage =
              'Only the task creator or a workspace administrator can delete this task.';

            return;
          }

          if (error.status === 404) {
            this.errorMessage =
              'This task could not be found. It may have already been deleted.';

            return;
          }

          this.errorMessage =
            'Unable to delete the task. Please try again.';
        },
      });
  }
}
