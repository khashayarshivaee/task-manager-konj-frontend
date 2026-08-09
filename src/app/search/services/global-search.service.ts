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
  GlobalSearchResponse,
} from '../models/global-search.model';

@Injectable({
  providedIn: 'root',
})
export class GlobalSearchService {
  private readonly http =
    inject(HttpClient);

  search(
    query: string,
    limit = 6,
  ): Observable<GlobalSearchResponse> {
    const term =
      query.trim();

    const params =
      new HttpParams()
        .set(
          'q',
          term,
        )
        .set(
          'limit',
          String(limit),
        );

    return this.http
      .get<GlobalSearchResponse>(
        `${environment.apiUrl}/search`,
        {
          params,
        },
      );
  }
}
