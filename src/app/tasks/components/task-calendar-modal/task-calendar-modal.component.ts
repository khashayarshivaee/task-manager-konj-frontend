import {
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';

import {
  IonContent,
  IonIcon,
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
  ProjectTask,
} from '../../models/task.model';

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
  ],
})
export class TaskCalendarModalComponent
  implements OnInit {
  private readonly modalController =
    inject(ModalController);

  @Input({ required: true })
  tasks: ProjectTask[] = [];

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

  private readonly tasksByDate =
    new Map<string, ProjectTask[]>();

  constructor() {
    addIcons({
      calendarOutline,
      chevronBackOutline,
      chevronForwardOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    this.buildTaskDateIndex();
    this.selectInitialDate();
  }

  get calendarDays(): TaskCalendarDay[] {
    const firstMonthDay =
      this.startOfMonth(
        this.currentMonth,
      );

    /*
     * JavaScript:
     * Sunday = 0
     *
     * Calendar:
     * Monday = 0
     */
    const mondayOffset =
      firstMonthDay.getDay() === 0
        ? 6
        : firstMonthDay.getDay() - 1;

    const calendarStart =
      new Date(firstMonthDay);

    calendarStart.setDate(
      calendarStart.getDate() -
      mondayOffset,
    );

    return Array.from(
      {
        length: 42,
      },
      (_, index): TaskCalendarDay => {
        const date =
          new Date(calendarStart);

        date.setDate(
          calendarStart.getDate() +
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
    return this.tasks.reduce(
      (total, task) =>
        task.due_at
          ? total + 1
          : total,
      0,
    );
  }

  get tasksWithoutDueDateCount(): number {
    return this.tasks.reduce(
      (total, task) =>
        task.due_at
          ? total
          : total + 1,
      0,
    );
  }

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1,
    );

    this.selectFirstTaskInCurrentMonth();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1,
    );

    this.selectFirstTaskInCurrentMonth();
  }

  goToToday(): void {
    const today = new Date();

    this.currentMonth =
      this.startOfMonth(today);

    this.selectedDateKey =
      this.getDateKey(today);
  }

  selectDay(
    day: TaskCalendarDay,
  ): void {
    this.selectedDateKey = day.key;

    if (!day.isCurrentMonth) {
      this.currentMonth =
        this.startOfMonth(day.date);
    }
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

  private buildTaskDateIndex(): void {
    this.tasksByDate.clear();

    this.tasks.forEach((task) => {
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

  private selectInitialDate(): void {
    const todayKey =
      this.getDateKey(new Date());

    if (
      this.tasksByDate.has(todayKey)
    ) {
      this.selectedDateKey =
        todayKey;

      return;
    }

    this.selectFirstTaskInCurrentMonth();

    if (!this.selectedDateKey) {
      this.selectedDateKey =
        todayKey;
    }
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
