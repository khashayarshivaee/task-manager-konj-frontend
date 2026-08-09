export type GlobalSearchResultType =
  | 'workspace'
  | 'project'
  | 'task'
  | 'comment';

export interface GlobalSearchResult {
  type: GlobalSearchResultType;

  id: number;

  workspace_id: number;

  project_id: number | null;

  task_id: number | null;

  title: string;

  subtitle: string;

  excerpt: string | null;
}

export interface GlobalSearchResults {
  workspaces: GlobalSearchResult[];
  projects: GlobalSearchResult[];
  tasks: GlobalSearchResult[];
  comments: GlobalSearchResult[];
}

export interface GlobalSearchResponse {
  data: {
    query: string;

    results: GlobalSearchResults;
  };
}
