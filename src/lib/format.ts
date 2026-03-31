import type { StudentRepo } from "../types/ezta";

export function shortSha(value: string | null) {
  return value ? value.slice(0, 10) : "Unset";
}

export function localDateTimeInputToUtcIso(value: string) {
  if (!value) {
    return null;
  }
  const localDate = new Date(value);
  if (Number.isNaN(localDate.getTime())) {
    return null;
  }
  return localDate.toISOString();
}

export function utcIsoToLocalDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function countByStatus(repos: StudentRepo[], status: string) {
  return repos.filter((repo) => repo.reviewStatus === status).length;
}

export function nextRepoId(repos: StudentRepo[], currentId: number | null) {
  if (repos.length === 0) {
    return null;
  }
  const currentIndex = repos.findIndex((repo) => repo.id === currentId);
  if (currentIndex === -1 || currentIndex === repos.length - 1) {
    return repos[0].id;
  }
  return repos[currentIndex + 1].id;
}

export function previousRepoId(repos: StudentRepo[], currentId: number | null) {
  if (repos.length === 0) {
    return null;
  }
  const currentIndex = repos.findIndex((repo) => repo.id === currentId);
  if (currentIndex <= 0) {
    return repos[repos.length - 1].id;
  }
  return repos[currentIndex - 1].id;
}
