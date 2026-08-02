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
  EditProjectModalComponent,
} from '../../components/edit-project-modal/edit-project-modal.component';


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
  arrowBackOutline,
  createOutline,
  calendarOutline,
  checkmarkCircleOutline,
  folderOpenOutline,
  personCircleOutline,
  timeOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

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

  private readonly destroyRef =
    inject(DestroyRef);

  project: Project | null = null;

  workspaceId = 0;
  projectId = 0;

  isLoading = true;
  errorMessage = '';
  showUpdateNotice = false;

  constructor() {
    addIcons({
      arrowBackOutline,
      calendarOutline,
      checkmarkCircleOutline,
      folderOpenOutline,
      personCircleOutline,
      timeOutline,
      createOutline,
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
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.project = null;

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
}
