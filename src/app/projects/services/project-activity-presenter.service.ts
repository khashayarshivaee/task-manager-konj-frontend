import { Injectable } from '@angular/core';

import {
  ProjectActivity,
} from '../models/project-activity.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectActivityPresenterService {
  getText(
    activity: ProjectActivity,
  ): string {
    const label =
      activity.subject_label?.trim();

    switch (activity.type) {
      case 'project_created':
        return 'created this project';

      case 'project_updated':
        return 'updated project details';

      case 'project_member_added':
        return label
          ? `added ${label} to the project`
          : 'added a project member';

      case 'project_member_removed':
        return label
          ? `removed ${label} from the project`
          : 'removed a project member';

      case 'task_created':
        return label
          ? `created task “${label}”`
          : 'created a task';

      case 'task_updated':
        return label
          ? `updated task “${label}”`
          : 'updated a task';

      case 'task_status_changed':
        return label
          ? `changed the status of “${label}”`
          : 'changed a task status';

      case 'task_assignees_changed':
        return label
          ? `updated assignees on “${label}”`
          : 'updated task assignees';

      case 'task_deleted':
        return label
          ? `deleted task “${label}”`
          : 'deleted a task';

      case 'comment_created':
        return 'added a comment';

      case 'comment_updated':
        return 'edited a comment';

      case 'comment_deleted':
        return 'deleted a comment';

      case 'task_attachment_added':
        return label
          ? `added attachment “${label}”`
          : 'added a task attachment';

      case 'task_attachment_removed':
        return label
          ? `removed attachment “${label}”`
          : 'removed a task attachment';

      case 'comment_attachment_added':
        return label
          ? `added comment image “${label}”`
          : 'added a comment image';

      case 'comment_attachment_removed':
        return label
          ? `removed comment image “${label}”`
          : 'removed a comment image';

      default:
        return 'updated the project';
    }
  }

  getActorName(
    activity: ProjectActivity,
  ): string {
    return (
      activity.actor?.name ??
      'System'
    );
  }

  getTime(
    activity: ProjectActivity,
  ): string {
    const createdAt =
      new Date(activity.created_at);

    if (
      Number.isNaN(
        createdAt.getTime(),
      )
    ) {
      return '';
    }

    const difference =
      Math.max(
        0,
        Date.now() -
        createdAt.getTime(),
      );

    const minute =
      60 * 1000;

    const hour =
      60 * minute;

    const day =
      24 * hour;

    if (difference < minute) {
      return 'Just now';
    }

    if (difference < hour) {
      return `${Math.floor(
        difference / minute,
      )}m ago`;
    }

    if (difference < day) {
      return `${Math.floor(
        difference / hour,
      )}h ago`;
    }

    if (difference < 7 * day) {
      return `${Math.floor(
        difference / day,
      )}d ago`;
    }

    return new Intl.DateTimeFormat(
      'en',
      {
        month: 'short',
        day: 'numeric',
      },
    ).format(createdAt);
  }
}
