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
  AlertController,
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
  closeOutline,
  peopleOutline,
  personRemoveOutline,
} from 'ionicons/icons';
import {
  finalize,
  forkJoin,
  map,
  switchMap,
  throwError,
} from 'rxjs';

import {
  AuthService,
} from '../../../core/services/auth.service';
import {
  UserAvatarComponent,
} from '../../../shared/components/user-avatar/user-avatar.component';
import {
  WorkspaceMember,
} from '../../../workspaces/models/workspace-member.model';
import {
  Workspace,
} from '../../../workspaces/models/workspace.model';
import {
  WorkspaceMemberService,
} from '../../../workspaces/services/workspace-member.service';
import {
  WorkspaceService,
} from '../../../workspaces/services/workspace.service';
import {
  ProjectMember,
} from '../../models/project-member.model';
import {
  Project,
} from '../../models/project.model';
import {
  ProjectMemberService,
} from '../../services/project-member.service';

@Component({
  selector: 'app-manage-project-members-modal',
  standalone: true,
  templateUrl:
    './manage-project-members-modal.component.html',
  styleUrl:
    './manage-project-members-modal.component.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    UserAvatarComponent,
  ],
})
export class ManageProjectMembersModalComponent
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

  private readonly alertController =
    inject(AlertController);

  private readonly authService =
    inject(AuthService);

  private readonly workspaceService =
    inject(WorkspaceService);

  private readonly workspaceMemberService =
    inject(WorkspaceMemberService);

  private readonly projectMemberService =
    inject(ProjectMemberService);

  private readonly destroyRef =
    inject(DestroyRef);

  workspace: Workspace | null = null;

  workspaceMembers: WorkspaceMember[] = [];

  projectMembers: ProjectMember[] = [];

  isLoading = true;

  addingUserId: number | null = null;

  removingMembershipId: number | null =
    null;

  errorMessage = '';

  constructor() {
    addIcons({
      addOutline,
      closeOutline,
      peopleOutline,
      personRemoveOutline,
    });
  }

  ngOnInit(): void {
    this.loadMembers();
  }

  get availableMembers(): WorkspaceMember[] {
    const projectUserIds =
      new Set(
        this.projectMembers.map(
          (member) => member.user_id,
        ),
      );

    return this.workspaceMembers.filter(
      (member) =>
        member.user.is_active &&
        !projectUserIds.has(
          member.user_id,
        ),
    );
  }

  get canManageMembers(): boolean {
    const workspace = this.workspace;

    const currentUser =
      this.authService.getCurrentUser();

    if (!workspace || !currentUser) {
      return false;
    }

    if (
      workspace.owner_id === currentUser.id
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

  loadMembers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.workspaceService
      .loadWorkspaces()
      .pipe(
        map(
          (workspaces) =>
            workspaces.find(
              (workspace) =>
                workspace.id ===
                this.workspaceId,
            ) ?? null,
        ),

        switchMap((workspace) => {
          if (!workspace) {
            return throwError(
              () =>
                new Error(
                  'workspace-not-found',
                ),
            );
          }

          this.workspace = workspace;

          return forkJoin({
            workspaceMembers:
              this.workspaceMemberService
                .getMembers(
                  this.workspaceId,
                ),

            projectMembers:
              this.projectMemberService
                .getMembers(
                  this.workspaceId,
                  this.project.id,
                ),
          });
        }),

        finalize(() => {
          this.isLoading = false;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: ({
                 workspaceMembers,
                 projectMembers,
               }) => {
          this.workspaceMembers =
            this.sortWorkspaceMembers(
              workspaceMembers,
            );

          this.projectMembers =
            this.sortProjectMembers(
              projectMembers,
            );
        },

        error: (error: unknown) => {
          this.workspaceMembers = [];
          this.projectMembers = [];

          if (
            error instanceof
            HttpErrorResponse
          ) {
            if (error.status === 403) {
              this.errorMessage =
                'You do not have access to the project members.';

              return;
            }

            if (error.status === 404) {
              this.errorMessage =
                'The project or workspace could not be found.';

              return;
            }
          }

          if (
            error instanceof Error &&
            error.message ===
            'workspace-not-found'
          ) {
            this.errorMessage =
              'This workspace is not available to your account.';

            return;
          }

          this.errorMessage =
            'Unable to load project members. Please try again.';
        },
      });
  }

  addMember(
    member: WorkspaceMember,
  ): void {
    if (
      !this.canManageMembers ||
      this.addingUserId !== null ||
      this.removingMembershipId !== null
    ) {
      return;
    }

    this.addingUserId =
      member.user_id;

    this.errorMessage = '';

    this.projectMemberService
      .addMember(
        this.workspaceId,
        this.project.id,
        {
          user_id: member.user_id,
        },
      )
      .pipe(
        finalize(() => {
          this.addingUserId = null;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (projectMember) => {
          this.projectMembers =
            this.sortProjectMembers([
              ...this.projectMembers,
              projectMember,
            ]);
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 403) {
            this.errorMessage =
              'You are not allowed to manage project members.';

            return;
          }

          if (error.status === 422) {
            this.errorMessage =
              'This workspace member cannot be added to the project.';

            return;
          }

          this.errorMessage =
            'Unable to add this project member.';
        },
      });
  }

  async removeMember(
    member: ProjectMember,
  ): Promise<void> {
    if (
      !this.canManageMembers ||
      this.removingMembershipId !== null ||
      this.addingUserId !== null ||
      this.isProjectCreator(member)
    ) {
      return;
    }

    const alert =
      await this.alertController.create({
        header: 'Remove project member?',

        message:
          `${member.user.name} will be removed from this project team.`,

        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Remove member',
            role: 'confirm',
          },
        ],
      });

    await alert.present();

    const result =
      await alert.onDidDismiss();

    if (result.role !== 'confirm') {
      return;
    }

    this.removingMembershipId =
      member.id;

    this.errorMessage = '';

    this.projectMemberService
      .removeMember(
        this.workspaceId,
        this.project.id,
        member.id,
      )
      .pipe(
        finalize(() => {
          this.removingMembershipId =
            null;
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: () => {
          this.projectMembers =
            this.projectMembers.filter(
              (currentMember) =>
                currentMember.id !==
                member.id,
            );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (error.status === 403) {
            this.errorMessage =
              'You are not allowed to remove project members.';

            return;
          }

          if (error.status === 422) {
            const backendMessage =
              error.error?.errors
                ?.membership?.[0];

            this.errorMessage =
              typeof backendMessage ===
              'string'
                ? backendMessage
                : 'This project member cannot be removed.';
            return;
          }

          this.errorMessage =
            'Unable to remove this project member.';
        },
      });
  }

  isProjectCreator(
    member: ProjectMember,
  ): boolean {
    return (
      this.project.created_by !== null &&
      member.user_id ===
      this.project.created_by
    );
  }

  close(): void {
    void this.modalController.dismiss(
      this.projectMembers,
      'members-updated',
    );
  }

  private sortProjectMembers(
    members: ProjectMember[],
  ): ProjectMember[] {
    return [...members].sort(
      (
        firstMember,
        secondMember,
      ) => {
        const firstIsCreator =
          this.isProjectCreator(
            firstMember,
          );

        const secondIsCreator =
          this.isProjectCreator(
            secondMember,
          );

        if (
          firstIsCreator !==
          secondIsCreator
        ) {
          return firstIsCreator
            ? -1
            : 1;
        }

        return firstMember.user.name
          .localeCompare(
            secondMember.user.name,
          );
      },
    );
  }

  private sortWorkspaceMembers(
    members: WorkspaceMember[],
  ): WorkspaceMember[] {
    return [...members].sort(
      (
        firstMember,
        secondMember,
      ) =>
        firstMember.user.name
          .localeCompare(
            secondMember.user.name,
          ),
    );
  }
}
