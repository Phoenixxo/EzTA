import type { EditorPreference, QueueSort, ReviewStatusFilter } from "../types/ezta";

export const eztaStorageKeys = {
  editorApp: "ezta.preferredEditorApp",
  editorApplicationPath: "ezta.preferredEditorApplicationPath",
  selectedAssignmentId: "ezta.selectedAssignmentId",
  selectedRepoId: "ezta.selectedRepoId",
  statusFilter: "ezta.statusFilter",
  repoQuery: "ezta.repoQuery",
  queueSort: "ezta.queueSort",
} as const;

export function readStoredEditorPreference(): {
  app: EditorPreference | null;
  applicationPath: string;
} {
  if (typeof window === "undefined") {
    return { app: null, applicationPath: "" };
  }
  const storedApp = window.localStorage.getItem(eztaStorageKeys.editorApp);
  const storedApplicationPath =
    window.localStorage.getItem(eztaStorageKeys.editorApplicationPath) ?? "";
  if (isEditorPreference(storedApp)) {
    return { app: storedApp, applicationPath: storedApplicationPath };
  }
  return { app: null, applicationPath: storedApplicationPath };
}

export function writeStoredEditorPreference(app: EditorPreference, applicationPath: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(eztaStorageKeys.editorApp, app);
  window.localStorage.setItem(
    eztaStorageKeys.editorApplicationPath,
    applicationPath,
  );
}

export function readStoredWorkspaceSelection(): {
  assignmentId: number | null;
  repoId: number | null;
  statusFilter: ReviewStatusFilter | null;
  repoQuery: string;
  queueSort: QueueSort | null;
} {
  if (typeof window === "undefined") {
    return {
      assignmentId: null,
      repoId: null,
      statusFilter: null,
      repoQuery: "",
      queueSort: null,
    };
  }

  const assignmentId = parsePositiveNumber(
    window.localStorage.getItem(eztaStorageKeys.selectedAssignmentId),
  );
  const repoId = parsePositiveNumber(
    window.localStorage.getItem(eztaStorageKeys.selectedRepoId),
  );
  const rawStatusFilter = window.localStorage.getItem(eztaStorageKeys.statusFilter);
  const rawRepoQuery = window.localStorage.getItem(eztaStorageKeys.repoQuery) ?? "";
  const rawQueueSort = window.localStorage.getItem(eztaStorageKeys.queueSort);

  return {
    assignmentId,
    repoId,
    statusFilter: isReviewStatusFilter(rawStatusFilter) ? rawStatusFilter : null,
    repoQuery: rawRepoQuery,
    queueSort: isQueueSort(rawQueueSort) ? rawQueueSort : null,
  };
}

export function writeStoredSelectedAssignmentId(assignmentId: number | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (assignmentId) {
    window.localStorage.setItem(eztaStorageKeys.selectedAssignmentId, String(assignmentId));
  } else {
    window.localStorage.removeItem(eztaStorageKeys.selectedAssignmentId);
  }
}

export function writeStoredSelectedRepoId(repoId: number | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (repoId) {
    window.localStorage.setItem(eztaStorageKeys.selectedRepoId, String(repoId));
  } else {
    window.localStorage.removeItem(eztaStorageKeys.selectedRepoId);
  }
}

export function writeStoredQueueControls(
  statusFilter: ReviewStatusFilter,
  repoQuery: string,
  queueSort: QueueSort,
) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(eztaStorageKeys.statusFilter, statusFilter);
  window.localStorage.setItem(eztaStorageKeys.repoQuery, repoQuery);
  window.localStorage.setItem(eztaStorageKeys.queueSort, queueSort);
}

export function syncEditorPreferenceFromStorageEvent(
  event: StorageEvent,
  handlers: {
    setEditorAppInput: (value: EditorPreference) => void;
    setEditorApplicationPathInput: (value: string) => void;
  },
) {
  if (event.key === eztaStorageKeys.editorApp && isEditorPreference(event.newValue)) {
    handlers.setEditorAppInput(event.newValue);
  }
  if (event.key === eztaStorageKeys.editorApplicationPath) {
    handlers.setEditorApplicationPathInput(event.newValue ?? "");
  }
}

function parsePositiveNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isEditorPreference(value: string | null): value is EditorPreference {
  return value === "system" || value === "application";
}

function isReviewStatusFilter(value: string | null): value is ReviewStatusFilter {
  return (
    value === "all" ||
    value === "not_started" ||
    value === "prepared" ||
    value === "reviewed"
  );
}

function isQueueSort(value: string | null): value is QueueSort {
  return (
    value === "student" ||
    value === "repo" ||
    value === "status" ||
    value === "updated"
  );
}
