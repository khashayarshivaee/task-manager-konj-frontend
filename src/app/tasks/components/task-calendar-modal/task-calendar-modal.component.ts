import {
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
} from '@angular/core';

import {
  HttpErrorResponse,
} from '@angular/common/http';

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
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
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

interface TaskCalendarDay {
  date: Date;
  key: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: ProjectTask[];
}

@Component({
  selector: 'app-task-calendar-modal',
  standalone: true,
  templateUrl:
    './task-calendar-modal.component.html',
  styleUrl:
    './task-calendar-modal.component.scss',
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
  ],
})
export class TaskCalendarModalComponent
  implements OnInit {
  private readonly modalController =
    inject(ModalController);

  private readonly taskService =
    inject(TaskService);

  private readonly destroyRef =
    inject(DestroyRef);

  @Input({ required: true })
  workspaceId!: number;

  @Input({ required: true })
  projectId!: number;

  readonly weekDays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ];

  currentMonth = this.startOfMonth(
    new Date(),
  );

  selectedDateKey = '';

  calendarTasks: ProjectTask[] = [];

  tasksWithoutDueDateCount = 0;

  calendarTaskTotal = 0;

  isLoadingCalendar = false;

  calendarErrorMessage = '';

  private readonly tasksByDate =
    new Map<string, ProjectTask[]>();

  private calendarRequestId = 0;

  constructor() {
    addIcons({
      calendarOutline,
      chevronBackOutline,
      chevronForwardOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    this.loadCalendarRange();
  }

  get calendarDays(): TaskCalendarDay[] {
    const range =
      this.getCalendarRange();

    return Array.from(
      {
        length: 42,
      },
      (_, index): TaskCalendarDay => {
        const date = new Date(
          range.start,
        );

        date.setDate(
          range.start.getDate() +
          index,
        );

        const key =
          this.getDateKey(date);

        return {
          date,
          key,

          dayNumber:
            date.getDate(),

          isCurrentMonth:
            date.getMonth() ===
            this.currentMonth.getMonth() &&
            date.getFullYear() ===
            this.currentMonth.getFullYear(),

          isToday:
            key ===
            this.getDateKey(new Date()),

          tasks:
            this.tasksByDate.get(key) ?? [],
        };
      },
    );
  }

  get monthLabel(): string {
    return new Intl.DateTimeFormat(
      'en-US',
      {
        month: 'long',
        year: 'numeric',
      },
    ).format(this.currentMonth);
  }

  get selectedDateLabel(): string {
    if (!this.selectedDateKey) {
      return 'Select a date';
    }

    const date =
      this.parseDateKey(
        this.selectedDateKey,
      );

    if (!date) {
      return 'Selected date';
    }

    return new Intl.DateTimeFormat(
      'en-US',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      },
    ).format(date);
  }

  get selectedTasks(): ProjectTask[] {
    if (!this.selectedDateKey) {
      return [];
    }

    return (
      this.tasksByDate.get(
        this.selectedDateKey,
      ) ?? []
    );
  }

  get dueTaskCount(): number {
    return this.calendarTaskTotal;
  }

  previousMonth(): void {
    if (this.isLoadingCalendar) {
      return;
    }

    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1,
    );

    this.selectedDateKey = '';

    this.loadCalendarRange();
  }

  nextMonth(): void {
    if (this.isLoadingCalendar) {
      return;
    }

    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1,
    );

    this.selectedDateKey = '';

    this.loadCalendarRange();
  }

  goToToday(): void {
    if (this.isLoadingCalendar) {
      return;
    }

    const today = new Date();

    this.currentMonth =
      this.startOfMonth(today);

    this.selectedDateKey =
      this.getDateKey(today);

    this.loadCalendarRange();
  }

  selectDay(
    day: TaskCalendarDay,
  ): void {
    this.selectedDateKey = day.key;

    if (!day.isCurrentMonth) {
      this.currentMonth =
        this.startOfMonth(day.date);

      this.loadCalendarRange();
    }
  }

  retryCalendar(): void {
    this.loadCalendarRange();
  }

  getTaskStatusLabel(
    task: ProjectTask,
  ): string {
    return task.status
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase(),
      );
  }

  getTaskPriorityLabel(
    task: ProjectTask,
  ): string {
    return (
      task.priority
        .charAt(0)
        .toUpperCase() +
      task.priority.slice(1)
    );
  }

  dismiss(): void {
    void this.modalController.dismiss(
      null,
      'closed',
    );
  }

  openTask(
    task: ProjectTask,
  ): void {
    void this.modalController.dismiss(
      task,
      'task',
    );
  }

  private loadCalendarRange(): void {
    if (
      !this.workspaceId ||
      !this.projectId
    ) {
      return;
    }

    const range =
      this.getCalendarRange();

    const requestId =
      ++this.calendarRequestId;

    this.isLoadingCalendar = true;
    this.calendarErrorMessage = '';

    this.taskService
      .getTaskCalendar(
        this.workspaceId,
        this.projectId,
        this.getDateKey(range.start),
        this.getDateKey(range.end),
      )
      .pipe(
        finalize(() => {
          if (
            requestId ===
            this.calendarRequestId
          ) {
            this.isLoadingCalendar =
              false;
          }
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          if (
            requestId !==
            this.calendarRequestId
          ) {
            return;
          }

          this.calendarTasks =
            response.data.tasks;

          this.tasksWithoutDueDateCount =
            response.data.without_due_date;

          this.calendarTaskTotal =
            response.meta.total;

          this.buildTaskDateIndex();

          this.selectDateAfterLoad(
            range.start,
            range.end,
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (
            requestId !==
            this.calendarRequestId
          ) {
            return;
          }

          this.calendarTasks = [];
          this.tasksByDate.clear();
          this.calendarTaskTotal = 0;

          if (error.status === 403) {
            this.calendarErrorMessage =
              'You do not have access to this project calendar.';

            return;
          }

          if (error.status === 404) {
            this.calendarErrorMessage =
              'The project calendar could not be found.';

            return;
          }

          if (error.status === 422) {
            this.calendarErrorMessage =
              'The requested calendar range is invalid.';

            return;
          }

          this.calendarErrorMessage =
            'Unable to load the project calendar.';
        },
      });
  }

  private buildTaskDateIndex(): void {
    this.tasksByDate.clear();

    this.calendarTasks.forEach((task) => {
      const dateKey =
        this.getTaskDueDateKey(task);

      if (!dateKey) {
        return;
      }

      const currentTasks =
        this.tasksByDate.get(dateKey) ?? [];

      currentTasks.push(task);

      currentTasks.sort(
        (
          firstTask,
          secondTask,
        ) =>
          firstTask.position -
          secondTask.position ||
          secondTask.id -
          firstTask.id,
      );

      this.tasksByDate.set(
        dateKey,
        currentTasks,
      );
    });
  }

  private selectDateAfterLoad(
    rangeStart: Date,
    rangeEnd: Date,
  ): void {
    if (
      this.selectedDateKey &&
      this.isDateKeyInsideRange(
        this.selectedDateKey,
        rangeStart,
        rangeEnd,
      )
    ) {
      return;
    }

    const today = new Date();

    const isCurrentMonth =
      today.getFullYear() ===
      this.currentMonth.getFullYear() &&
      today.getMonth() ===
      this.currentMonth.getMonth();

    const todayKey =
      this.getDateKey(today);

    if (
      isCurrentMonth &&
      this.tasksByDate.has(todayKey)
    ) {
      this.selectedDateKey =
        todayKey;

      return;
    }

    this.selectFirstTaskInCurrentMonth();

    if (this.selectedDateKey) {
      return;
    }

    this.selectedDateKey =
      isCurrentMonth
        ? todayKey
        : this.getDateKey(
          this.currentMonth,
        );
  }

  private selectFirstTaskInCurrentMonth(): void {
    const year =
      this.currentMonth.getFullYear();

    const month =
      this.currentMonth.getMonth();

    const matchingKey = [
      ...this.tasksByDate.keys(),
    ]
      .sort()
      .find((dateKey) => {
        const date =
          this.parseDateKey(dateKey);

        return (
          date !== null &&
          date.getFullYear() === year &&
          date.getMonth() === month
        );
      });

    this.selectedDateKey =
      matchingKey ?? '';
  }

  private getCalendarRange(): {
    start: Date;
    end: Date;
  } {
    const firstMonthDay =
      this.startOfMonth(
        this.currentMonth,
      );

    const mondayOffset =
      firstMonthDay.getDay() === 0
        ? 6
        : firstMonthDay.getDay() - 1;

    const start =
      new Date(firstMonthDay);

    start.setDate(
      start.getDate() -
      mondayOffset,
    );

    const end = new Date(start);

    end.setDate(
      end.getDate() + 41,
    );

    return {
      start,
      end,
    };
  }

  private getTaskDueDateKey(
    task: ProjectTask,
  ): string | null {
    if (!task.due_at) {
      return null;
    }

    const dateKey =
      task.due_at.substring(0, 10);

    return /^\d{4}-\d{2}-\d{2}$/.test(
      dateKey,
    )
      ? dateKey
      : null;
  }

  private isDateKeyInsideRange(
    dateKey: string,
    start: Date,
    end: Date,
  ): boolean {
    const date =
      this.parseDateKey(dateKey);

    if (!date) {
      return false;
    }

    return (
      date >= start &&
      date <= end
    );
  }

  private getDateKey(
    date: Date,
  ): string {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDateKey(
    dateKey: string,
  ): Date | null {
    const date = new Date(
      `${dateKey}T00:00:00`,
    );

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date;
  }

  private startOfMonth(
    date: Date,
  ): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    );
  }
}
