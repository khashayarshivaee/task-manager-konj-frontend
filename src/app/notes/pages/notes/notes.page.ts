import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

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
  AuthService,
} from '../../../core/services/auth.service';

import {
  WorkspaceNoteEditorModalComponent,
} from '../../components/workspace-note-editor-modal/workspace-note-editor-modal.component';



import {
  addIcons,
} from 'ionicons';

import {
  addOutline,
  arrowBackOutline,
  documentTextOutline,
  imageOutline,
  pinOutline,
  refreshOutline,
  searchOutline,
} from 'ionicons/icons';

import {
  finalize,
  firstValueFrom,
} from 'rxjs';

import {
  Workspace,
} from '../../../workspaces/models/workspace.model';

import {
  WorkspaceService,
} from '../../../workspaces/services/workspace.service';

import {
  WorkspaceNote,
  WorkspaceNotePaginationMeta,
} from '../../models/workspace-note.model';

import {
  WorkspaceNoteService,
} from '../../services/workspace-note.service';

@Component({
  selector: 'app-notes',
  standalone: true,

  templateUrl:
    './notes.page.html',

  styleUrl:
    './notes.page.scss',

  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class NotesPage implements OnInit {
  private readonly route =
    inject(ActivatedRoute);

  private readonly modalController =
    inject(ModalController);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly workspaceService =
    inject(WorkspaceService);

  private readonly noteService =
    inject(WorkspaceNoteService);

  workspace: Workspace | null =
    null;

  notes: WorkspaceNote[] = [];

  pagination:
    | WorkspaceNotePaginationMeta
    | null = null;

  searchTerm = '';

  isLoading = false;

  pageErrorMessage = '';

  private workspaceId = 0;

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      documentTextOutline,
      imageOutline,
      pinOutline,
      refreshOutline,
      searchOutline,
    });
  }

  ngOnInit(): void {
    this.workspaceId =
      Number(
        this.route.snapshot
          .paramMap
          .get('workspaceId'),
      );

    if (
      !Number.isInteger(
        this.workspaceId,
      ) ||
      this.workspaceId <= 0
    ) {
      void this.router
        .navigateByUrl('/home');

      return;
    }

    void this.loadPage();
  }

  async loadPage(): Promise<void> {
    this.pageErrorMessage = '';

    let workspace =
      this.workspaceService
        .getWorkspaces()
        .find(
          (item) =>
            item.id ===
            this.workspaceId,
        );

    if (!workspace) {
      try {
        const workspaces =
          await firstValueFrom(
            this.workspaceService
              .loadWorkspaces(),
          );

        workspace =
          workspaces.find(
            (item) =>
              item.id ===
              this.workspaceId,
          );
      } catch {
        this.pageErrorMessage =
          'Unable to load the workspace.';

        return;
      }
    }

    if (!workspace) {
      void this.router
        .navigateByUrl('/home');

      return;
    }

    this.workspace = workspace;

    this.workspaceService
      .setActiveWorkspace(
        workspace,
      );

    this.loadNotes();
  }

  loadNotes(): void {
    if (
      !this.workspace ||
      this.isLoading
    ) {
      return;
    }

    this.isLoading = true;
    this.pageErrorMessage = '';

    this.noteService
      .getNotes(
        this.workspace.id,
        this.searchTerm,
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.notes =
            response.data.notes;

          this.pagination =
            response.meta;
        },

        error: () => {
          this.notes = [];
          this.pagination = null;

          this.pageErrorMessage =
            'Unable to load workspace notes.';
        },
      });
  }

  onSearchInput(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    this.searchTerm =
      input.value;

    this.loadNotes();
  }

  clearSearch(): void {
    if (!this.searchTerm) {
      return;
    }

    this.searchTerm = '';
    this.loadNotes();
  }

  goBack(): void {
    void this.router
      .navigateByUrl('/home');
  }

  async openCreateNote(): Promise<void> {
    if (!this.workspace) {
      return;
    }

    const modal =
      await this.modalController
        .create({
          component:
          WorkspaceNoteEditorModalComponent,

          componentProps: {
            workspace:
            this.workspace,

            note: null,

            editable: true,
          },

          cssClass:
            'workspace-note-editor-modal',
        });

    await modal.present();

    const result =
      await modal.onDidDismiss();

    if (
      result.role === 'created' ||
      result.role === 'updated' ||
      result.role === 'deleted'
    ) {
      this.loadNotes();
    }
  }
  async openNote(
    note: WorkspaceNote,
  ): Promise<void> {
    if (!this.workspace) {
      return;
    }

    const modal =
      await this.modalController
        .create({
          component:
          WorkspaceNoteEditorModalComponent,

          componentProps: {
            workspace:
            this.workspace,

            note,

            editable:
              this.canEditNote(
                note,
              ),
          },

          cssClass:
            'workspace-note-editor-modal',
        });

    await modal.present();

    const result =
      await modal.onDidDismiss();

    if (
      result.role === 'created' ||
      result.role === 'updated' ||
      result.role === 'deleted'
    ) {
      this.loadNotes();
    }
  }

  canEditNote(
    note: WorkspaceNote,
  ): boolean {
    if (!this.workspace) {
      return false;
    }

    const user =
      this.authService
        .getCurrentUser();

    if (!user) {
      return false;
    }

    if (
      this.workspace.owner_id ===
      user.id
    ) {
      return true;
    }

    const role =
      this.workspace
        .membership
        ?.role;

    if (
      role === 'owner' ||
      role === 'admin'
    ) {
      return true;
    }

    return (
      note.author_id ===
      user.id
    );
  }

  formatUpdatedAt(
    value: string,
  ): string {
    return new Intl.DateTimeFormat(
      'en',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      },
    ).format(
      new Date(value),
    );
  }
}
