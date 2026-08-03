import {
  HttpErrorResponse,
} from '@angular/common/http';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
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
  AlertController,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  arrowBackOutline,
  peopleOutline,
  personRemoveOutline,
  refreshOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import {
  finalize,
  map,
  switchMap,
  throwError,
} from 'rxjs';

import {
  AuthService,
} from '../../../core/services/auth.service';
import {
  ManageableWorkspaceRole,
  WorkspaceMember,
} from '../../models/workspace-member.model';
import {
  Workspace,
} from '../../models/workspace.model';
import {
  WorkspaceMemberService,
} from '../../services/workspace-member.service';
import {
  WorkspaceService,
} from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-members',
  standalone: true,
  templateUrl: './workspace-members.page.html',
  styleUrl: './workspace-members.page.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    UserAvatarComponent,
  ],
})
export class WorkspaceMembersPage
  implements OnInit {
  private readonly activatedRoute =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly alertController =
    inject(AlertController);

  private readonly authService =
    inject(AuthService);

  private readonly workspaceService =
    inject(WorkspaceService);

  private readonly memberService =
    inject(WorkspaceMemberService);

  private readonly destroyRef =
    inject(DestroyRef);

  workspaceId = 0;

  workspace: Workspace | null = null;
  members: WorkspaceMember[] = [];

  isLoading = true;
  updatingMembershipId: number | null = null;
  removingMembershipId: number | null = null;

  pageErrorMessage = '';
  actionErrorMessage = '';

  constructor() {
    addIcons({
      arrowBackOutline,
      peopleOutline,
      personRemoveOutline,
      refreshOutline,
      shieldCheckmarkOutline,
    });
  }

  ngOnInit(): void {
    this.workspaceId = Number(
      this.activatedRoute.snapshot.paramMap.get(
        'workspaceId',
      ),
    );

    if (
      !Number.isInteger(this.workspaceId) ||
      this.workspaceId <= 0
    ) {
      this.isLoading = false;

      this.pageErrorMessage =
        'The requested workspace address is invalid.';

      return;
    }

    this.loadPage();
  }

  loadPage(): void {
    if (this.isLoading && this.workspace) {
      return;
    }

    this.isLoading = true;
    this.pageErrorMessage = '';
    this.actionErrorMessage = '';

    this.workspaceService
      .loadWorkspaces()
      .pipe(
        map((workspaces) =>
          workspaces.find(
            (workspace) =>
              workspace.id === this.workspaceId,
          ) ?? null,
        ),

        switchMap((workspace) => {
          if (!workspace) {
            return throwError(
              () => new Error(
                'workspace-not-found',
              ),
            );
          }

          this.workspace = workspace;

          return this.memberService.getMembers(
            this.workspaceId,
          );
        }),

        finalize(() => {
          this.isLoading = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (members) => {
          this.members =
            this.sortMembers(members);
        },

        error: (error: unknown) => {
          this.workspace = null;
          this.members = [];

          if (
            error instanceof HttpErrorResponse
          ) {
            if (error.status === 403) {
              this.pageErrorMessage =
                'You do not have access to this workspace.';

              return;
            }

            if (error.status === 404) {
              this.pageErrorMessage =
                'This workspace could not be found.';

              return;
            }
          }

          if (
            error instanceof Error &&
            error.message ===
            'workspace-not-found'
          ) {
            this.pageErrorMessage =
              'This workspace is not available to your account.';

            return;
          }

          this.pageErrorMessage =
            'Unable to load workspace members. Please try again.';
        },
      });
  }

  updateMemberRole(
    member: WorkspaceMember,
    event: Event,
  ): void {
    const select =
      event.target as HTMLSelectElement;

    const nextRole =
      select.value as ManageableWorkspaceRole;

    if (
      member.role === nextRole ||
      this.updatingMembershipId !== null
    ) {
      return;
    }

    this.updatingMembershipId = member.id;
    this.actionErrorMessage = '';

    this.memberService
      .updateMemberRole(
        this.workspaceId,
        member.id,
        nextRole,
      )
      .pipe(
        finalize(() => {
          this.updatingMembershipId = null;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedMember) => {
          this.members = this.sortMembers(
            this.members.map(
              (currentMember) =>
                currentMember.id ===
                updatedMember.id
                  ? updatedMember
                  : currentMember,
            ),
          );
        },

        error: (error: HttpErrorResponse) => {
          select.value = member.role;

          if (error.status === 403) {
            this.actionErrorMessage =
              'You are not allowed to change member roles.';

            return;
          }

          if (error.status === 422) {
            this.actionErrorMessage =
              'The selected member role could not be updated.';

            return;
          }

          this.actionErrorMessage =
            'Unable to update the member role.';
        },
      });
  }

  async removeMember(
    member: WorkspaceMember,
  ): Promise<void> {
    if (
      this.removingMembershipId !== null ||
      member.role === 'owner'
    ) {
      return;
    }

    const alert =
      await this.alertController.create({
        header: 'Remove workspace member?',
        message:
          `${member.user.name} will lose access to this workspace and its projects.`,
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

    const result = await alert.onDidDismiss();

    if (result.role !== 'confirm') {
      return;
    }

    this.removingMembershipId = member.id;
    this.actionErrorMessage = '';

    this.memberService
      .removeMember(
        this.workspaceId,
        member.id,
      )
      .pipe(
        finalize(() => {
          this.removingMembershipId = null;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.members = this.members.filter(
            (currentMember) =>
              currentMember.id !== member.id,
          );
        },

        error: (error: HttpErrorResponse) => {
          if (error.status === 403) {
            this.actionErrorMessage =
              'You are not allowed to remove workspace members.';

            return;
          }

          if (error.status === 422) {
            this.actionErrorMessage =
              'The workspace owner cannot be removed.';

            return;
          }

          this.actionErrorMessage =
            'Unable to remove this workspace member.';
        },
      });
  }

  canManageMembers(): boolean {
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

  isCurrentUser(
    member: WorkspaceMember,
  ): boolean {
    return (
      member.user_id ===
      this.authService.getCurrentUser()?.id
    );
  }

  // getInitials(name: string): string {
  //   return name
  //     .trim()
  //     .split(/\s+/)
  //     .filter(Boolean)
  //     .slice(0, 2)
  //     .map(
  //       (part) =>
  //         part.charAt(0).toUpperCase(),
  //     )
  //     .join('');
  // }

  getRoleLabel(
    member: WorkspaceMember,
  ): string {
    return (
      member.role.charAt(0).toUpperCase() +
      member.role.slice(1)
    );
  }

  goBack(): void {
    void this.router.navigateByUrl('/home');
  }

  private sortMembers(
    members: WorkspaceMember[],
  ): WorkspaceMember[] {
    const roleOrder:
      Record<WorkspaceMember['role'], number> = {
      owner: 0,
      admin: 1,
      member: 2,
    };

    return [...members].sort(
      (firstMember, secondMember) => {
        const roleDifference =
          roleOrder[firstMember.role] -
          roleOrder[secondMember.role];

        if (roleDifference !== 0) {
          return roleDifference;
        }

        return firstMember.user.name.localeCompare(
          secondMember.user.name,
        );
      },
    );
  }
}
