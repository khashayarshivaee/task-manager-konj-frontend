import {
  AsyncPipe,
} from '@angular/common';
import {
  Component,
  inject,
  OnInit,
} from '@angular/core';
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
  addOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  createOutline,
  gridOutline,
  peopleOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  finalize,
} from 'rxjs';

import {
  AuthService,
} from '../../../core/services/auth.service';
import {
  CreateWorkspaceModalComponent,
} from '../../components/create-workspace-modal/create-workspace-modal.component';
import {
  DeleteWorkspaceModalComponent,
} from '../../components/delete-workspace-modal/delete-workspace-modal.component';
import {
  EditWorkspaceModalComponent,
} from '../../components/edit-workspace-modal/edit-workspace-modal.component';
import {
  Workspace,
} from '../../models/workspace.model';
import {
  WorkspaceService,
} from '../../services/workspace.service';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  templateUrl: './workspaces.page.html',
  styleUrl: './workspaces.page.scss',
  imports: [
    AsyncPipe,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class WorkspacesPage implements OnInit {
  private readonly authService =
    inject(AuthService);

  private readonly workspaceService =
    inject(WorkspaceService);

  private readonly modalController =
    inject(ModalController);

  private readonly router =
    inject(Router);

  readonly workspaces$ =
    this.workspaceService.workspaces$;

  readonly activeWorkspace$ =
    this.workspaceService.activeWorkspace$;

  isLoading = false;

  errorMessage = '';

  noticeMessage = '';

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
      createOutline,
      gridOutline,
      peopleOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.workspaceService
      .loadWorkspaces()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        error: () => {
          this.errorMessage =
            'Unable to load your workspaces. Please try again.';
        },
      });
  }

  selectWorkspace(
    workspace: Workspace,
  ): void {
    if (
      this.isWorkspaceActive(
        workspace,
      )
    ) {
      return;
    }

    this.workspaceService
      .setActiveWorkspace(
        workspace,
      );

    this.noticeMessage =
      `${workspace.name} is now your active workspace.`;
  }

  isWorkspaceActive(
    workspace: Workspace,
  ): boolean {
    return (
      this.workspaceService
        .getActiveWorkspace()
        ?.id === workspace.id
    );
  }

  getWorkspaceRole(
    workspace: Workspace,
  ): string {
    const currentUser =
      this.authService.getCurrentUser();

    if (
      currentUser &&
      workspace.owner_id ===
      currentUser.id
    ) {
      return 'Owner';
    }

    const membershipRole =
      workspace.membership?.role ??
      workspace.memberships?.find(
        (membership) =>
          membership.user_id ===
          currentUser?.id,
      )?.role;

    if (!membershipRole) {
      return 'Member';
    }

    return (
      membershipRole
        .charAt(0)
        .toUpperCase() +
      membershipRole.slice(1)
    );
  }

  canManageWorkspace(
    workspace: Workspace,
  ): boolean {
    const currentUser =
      this.authService.getCurrentUser();

    if (!currentUser) {
      return false;
    }

    if (
      workspace.owner_id ===
      currentUser.id
    ) {
      return true;
    }

    const membershipRole =
      workspace.membership?.role ??
      workspace.memberships?.find(
        (membership) =>
          membership.user_id ===
          currentUser.id,
      )?.role;

    return (
      membershipRole === 'owner' ||
      membershipRole === 'admin'
    );
  }

  canDeleteWorkspace(
    workspace: Workspace,
  ): boolean {
    const currentUser =
      this.authService.getCurrentUser();

    return (
      currentUser !== null &&
      workspace.owner_id ===
      currentUser.id
    );
  }

  async createWorkspace(): Promise<void> {
    this.noticeMessage = '';

    const modal =
      await this.modalController.create({
        component:
        CreateWorkspaceModalComponent,

        cssClass:
          'workspace-create-modal',

        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss();

    if (result.role === 'created') {
      this.noticeMessage =
        'Workspace created successfully.';
    }
  }

  async editWorkspace(
    workspace: Workspace,
  ): Promise<void> {
    this.noticeMessage = '';

    const modal =
      await this.modalController.create({
        component:
        EditWorkspaceModalComponent,

        componentProps: {
          workspace,
        },

        cssClass:
          'workspace-edit-modal',

        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<Workspace>();

    if (
      result.role === 'updated' &&
      result.data
    ) {
      this.noticeMessage =
        'Workspace updated successfully.';
    }
  }

  async deleteWorkspace(
    workspace: Workspace,
  ): Promise<void> {
    this.noticeMessage = '';

    const modal =
      await this.modalController.create({
        component:
        DeleteWorkspaceModalComponent,

        componentProps: {
          workspace,
        },

        cssClass:
          'workspace-delete-modal',

        backdropDismiss: false,
      });

    await modal.present();

    const result =
      await modal.onDidDismiss<Workspace>();

    if (result.role === 'deleted') {
      this.noticeMessage =
        'Workspace deleted successfully.';
    }
  }

  openMembers(
    workspace: Workspace,
  ): void {
    void this.router.navigate([
      '/workspaces',
      workspace.id,
      'members',
    ]);
  }

  goHome(): void {
    void this.router.navigateByUrl(
      '/home',
    );
  }
}
