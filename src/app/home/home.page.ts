import { AsyncPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  checkmarkCircleOutline,
  checkboxOutline,
  chevronDownOutline,
  closeOutline,
  folderOpenOutline,
  gridOutline,
  homeOutline,
  logOutOutline,
  menuOutline,
  notificationsOutline,
  peopleOutline,
  rocketOutline,
  searchOutline,
  settingsOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import {
  CreateWorkspaceModalComponent,
} from '../workspaces/components/create-workspace-modal/create-workspace-modal.component';
import { WorkspaceService } from '../workspaces/services/workspace.service';

import {
  Workspace,
} from '../workspaces/models/workspace.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    AsyncPipe,
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class HomePage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly modalController = inject(ModalController);
  private readonly router = inject(Router);

  readonly currentUser$ = this.authService.currentUser$;
  readonly activeWorkspace$ =
    this.workspaceService.activeWorkspace$;

  readonly workspaces$ =
    this.workspaceService.workspaces$;

  isSidebarOpen = false;
  isLoggingOut = false;
  isLoadingWorkspaces = false;
  workspaceLoadError = '';
  showWorkspaceNotice = false;
  isWorkspaceMenuOpen = false;
  @ViewChild('workspaceSwitcher')
  private workspaceSwitcher?: ElementRef<HTMLElement>;

  constructor() {
    addIcons({
      addOutline,
      calendarOutline,
      checkmarkCircleOutline,
      checkboxOutline,
      chevronDownOutline,
      closeOutline,
      folderOpenOutline,
      gridOutline,
      homeOutline,
      logOutOutline,
      menuOutline,
      notificationsOutline,
      peopleOutline,
      rocketOutline,
      searchOutline,
      settingsOutline,
    });
  }

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  private loadWorkspaces(): void {
    this.isLoadingWorkspaces = true;
    this.workspaceLoadError = '';

    this.workspaceService
      .loadWorkspaces()
      .pipe(
        finalize(() => {
          this.isLoadingWorkspaces = false;
        }),
      )
      .subscribe({
        error: () => {
          this.workspaceLoadError =
            'Unable to load your workspaces. Please refresh the page.';
        },
      });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }
  toggleWorkspaceMenu(
    event: MouseEvent,
  ): void {
    event.stopPropagation();

    this.isWorkspaceMenuOpen =
      !this.isWorkspaceMenuOpen;
  }

  closeWorkspaceMenu(): void {
    this.isWorkspaceMenuOpen = false;
  }

  selectWorkspace(
    workspace: Workspace,
  ): void {
    if (
      this.workspaceService
        .getActiveWorkspace()
        ?.id === workspace.id
    ) {
      this.closeWorkspaceMenu();

      return;
    }

    this.workspaceService
      .setActiveWorkspace(workspace);

    this.showWorkspaceNotice = false;
    this.closeWorkspaceMenu();
    this.closeSidebar();
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
      workspace.owner_id === currentUser.id
    ) {
      return 'Owner';
    }

    const membershipRole =
      workspace.membership?.role ??
      workspace.memberships?.find(
        (membership) =>
          membership.user_id === currentUser?.id,
      )?.role;

    if (!membershipRole) {
      return 'Member';
    }

    return (
      membershipRole.charAt(0).toUpperCase() +
      membershipRole.slice(1)
    );
  }

  openCreateWorkspaceFromMenu(): void {
    this.closeWorkspaceMenu();

    void this.showCreateWorkspaceNotice();
  }

  retryLoadWorkspaces(): void {
    this.loadWorkspaces();
  }

  async showCreateWorkspaceNotice(): Promise<void> {
    this.closeWorkspaceMenu();
    const modal = await this.modalController.create({
      component: CreateWorkspaceModalComponent,
      cssClass: 'workspace-create-modal',
      backdropDismiss: false,
    });

    await modal.present();

    const result = await modal.onDidDismiss();

    if (result.role === 'created') {
      this.showWorkspaceNotice = true;
    }
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.isLoggingOut = false;
          this.workspaceService.resetWorkspaceState();
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/login');
        },
        error: () => {
          void this.router.navigateByUrl('/login');
        },
      });
  }

  getInitials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  getFirstName(name: string): string {
    return name.trim().split(/\s+/)[0] || 'there';
  }

  @HostListener(
    'document:click',
    ['$event'],
  )
  handleDocumentClick(
    event: MouseEvent,
  ): void {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (
      this.workspaceSwitcher
        ?.nativeElement
        .contains(target)
    ) {
      return;
    }

    this.closeWorkspaceMenu();
  }

  @HostListener(
    'document:keydown.escape',
  )
  handleEscapeKey(): void {
    this.closeWorkspaceMenu();
  }
}
