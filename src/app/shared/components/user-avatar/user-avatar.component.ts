import {
  Component,
  Input,
  OnChanges,
} from '@angular/core';

import {
  environment,
} from '../../../../environments/environment';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  templateUrl: './user-avatar.component.html',
  styleUrl: './user-avatar.component.scss',
})
export class UserAvatarComponent
  implements OnChanges {
  @Input() name = '';

  @Input()
  avatarPath: string | null = null;

  @Input() size = 42;

  @Input() fontSize = 11;

  imageFailed = false;

  ngOnChanges(): void {
    this.imageFailed = false;
  }

  get avatarUrl(): string | null {
    if (
      !this.avatarPath ||
      this.imageFailed
    ) {
      return null;
    }

    if (
      this.avatarPath.startsWith('http://') ||
      this.avatarPath.startsWith('https://')
    ) {
      return this.avatarPath;
    }

    const apiOrigin =
      environment.apiUrl.replace(
        /\/api\/?$/,
        '',
      );

    const cleanPath =
      this.avatarPath
        .replace(/^\/+/, '')
        .replace(/^storage\//, '');

    return `${apiOrigin}/storage/${cleanPath}`;
  }

  get initials(): string {
    const initials = this.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0).toUpperCase(),
      )
      .join('');

    return initials || '?';
  }

  handleImageError(): void {
    this.imageFailed = true;
  }
}
