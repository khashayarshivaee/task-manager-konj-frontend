import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import {
  addIcons,
} from 'ionicons';
import {
  businessOutline,
  chatbubbleEllipsesOutline,
  checkboxOutline,
  closeOutline,
  folderOpenOutline,
  searchOutline,
} from 'ionicons/icons';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from 'rxjs';

import {
  GlobalSearchResult,
  GlobalSearchResults,
} from '../../models/global-search.model';

import {
  GlobalSearchService,
} from '../../services/global-search.service';

@Component({
  selector:
    'app-global-search-modal',

  templateUrl:
    './global-search-modal.component.html',

  styleUrls: [
    './global-search-modal.component.scss',
  ],

  imports: [
    ReactiveFormsModule,
    IonIcon,
    IonSpinner,
  ],
})
export class GlobalSearchModalComponent
  implements AfterViewInit {
  private readonly searchService =
    inject(GlobalSearchService);

  private readonly modalController =
    inject(ModalController);

  private readonly destroyRef =
    inject(DestroyRef);

  @ViewChild('searchInput')
  private searchInput?:
    ElementRef<HTMLInputElement>;

  readonly searchControl =
    new FormControl(
      '',
      {
        nonNullable: true,
      },
    );

  results: GlobalSearchResults = {
    workspaces: [],
    projects: [],
    tasks: [],
    comments: [],
  };

  isSearching = false;
  hasSearched = false;
  searchError = '';

  selectedIndex = -1;

  constructor() {
    addIcons({
      businessOutline,
      chatbubbleEllipsesOutline,
      checkboxOutline,
      closeOutline,
      folderOpenOutline,
      searchOutline,
    });

    this.watchSearch();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.searchInput
        ?.nativeElement
        .focus();
    });
  }

  get flattenedResults():
    GlobalSearchResult[] {
    return [
      ...this.results.workspaces,
      ...this.results.projects,
      ...this.results.tasks,
      ...this.results.comments,
    ];
  }

  get hasResults(): boolean {
    return (
      this.flattenedResults.length > 0
    );
  }

  get queryLength(): number {
    return this.searchControl
      .value
      .trim()
      .length;
  }

  async close(): Promise<void> {
    await this.modalController.dismiss(
      null,
      'cancelled',
    );
  }

  async selectResult(
    result: GlobalSearchResult,
  ): Promise<void> {
    await this.modalController.dismiss(
      result,
      'selected',
    );
  }

  handleKeydown(
    event: KeyboardEvent,
  ): void {
    const results =
      this.flattenedResults;

    if (event.key === 'Escape') {
      event.preventDefault();

      void this.close();

      return;
    }

    if (
      results.length === 0
    ) {
      return;
    }

    if (
      event.key === 'ArrowDown'
    ) {
      event.preventDefault();

      this.selectedIndex =
        this.selectedIndex >=
        results.length - 1
          ? 0
          : this.selectedIndex + 1;

      return;
    }

    if (
      event.key === 'ArrowUp'
    ) {
      event.preventDefault();

      this.selectedIndex =
        this.selectedIndex <= 0
          ? results.length - 1
          : this.selectedIndex - 1;

      return;
    }

    if (
      event.key === 'Enter'
    ) {
      event.preventDefault();

      const selected =
        results[
          this.selectedIndex
          ];

      if (selected) {
        void this.selectResult(
          selected,
        );
      }
    }
  }

  selectIndex(
    result: GlobalSearchResult,
  ): void {
    this.selectedIndex =
      this.flattenedResults
        .findIndex(
          (item) =>
            this.resultKey(item) ===
            this.resultKey(result),
        );
  }

  isSelected(
    result: GlobalSearchResult,
  ): boolean {
    const selected =
      this.flattenedResults[
        this.selectedIndex
        ];

    if (!selected) {
      return false;
    }

    return (
      this.resultKey(selected) ===
      this.resultKey(result)
    );
  }

  resultKey(
    result: GlobalSearchResult,
  ): string {
    return `${result.type}-${result.id}`;
  }

  private watchSearch(): void {
    this.searchControl
      .valueChanges
      .pipe(
        debounceTime(220),

        distinctUntilChanged(),

        tap((value) => {
          const query =
            value.trim();

          this.searchError = '';
          this.selectedIndex = -1;

          if (
            query.length < 2
          ) {
            this.results =
              this.emptyResults();

            this.isSearching =
              false;

            this.hasSearched =
              false;
          }
        }),

        switchMap((value) => {
          const query =
            value.trim();

          if (
            query.length < 2
          ) {
            return of(null);
          }

          this.isSearching = true;
          this.hasSearched = true;

          return this.searchService
            .search(
              query,
              6,
            )
            .pipe(
              catchError(() => {
                this.searchError =
                  'Unable to search right now.';

                return of(null);
              }),
            );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((response) => {
        this.isSearching = false;

        if (!response) {
          if (
            this.queryLength >= 2
          ) {
            this.results =
              this.emptyResults();
          }

          return;
        }

        this.results =
          response.data.results;

        this.selectedIndex =
          this.flattenedResults.length
          > 0
            ? 0
            : -1;
      });
  }

  private emptyResults():
    GlobalSearchResults {
    return {
      workspaces: [],
      projects: [],
      tasks: [],
      comments: [],
    };
  }
}
