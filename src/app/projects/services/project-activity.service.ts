import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import {
  Injectable,
  inject,
} from '@angular/core';
import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';

import {
  ListProjectActivitiesResponse,
} from '../models/project-activity.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectActivityService {
  private readonly http =
    inject(HttpClient);

  private readonly workspacesUrl =
    `${environment.apiUrl}/workspaces`;

  getActivities(
    workspaceId: number,
    projectId: number,
    page: number = 1,
    perPage: number = 20,
  ): Observable<ListProjectActivitiesResponse> {
    const params =
      new HttpParams()
        .set(
          'page',
          page.toString(),
        )
        .set(
          'per_page',
          perPage.toString(),
        );

    return this.http.get<
      ListProjectActivitiesResponse
    >(
      `${this.workspacesUrl}/${workspaceId}/projects/${projectId}/activities`,
      {
        params,
      },
    );
  }
}
