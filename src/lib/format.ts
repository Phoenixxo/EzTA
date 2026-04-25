import type { StudentRepo, SubmissionKind } from "../types/ezta";

export function shortSha(value: string | null) {
  return value ? value.slice(0, 10) : "Unset";
}

export function submissionDisplayName(
  repo: StudentRepo,
  assignmentSubmissionKind?: SubmissionKind | null,
) {
  if (assignmentSubmissionKind === "group") {
    return (
      repo.rosterGroupName?.trim() ||
      repo.studentName ||
      repo.studentKey ||
      repo.repoName
    );
  }
  return (
    repo.studentName ||
    repo.studentKey ||
    repo.rosterGroupName?.trim() ||
    repo.repoName
  );
}

export function submissionMemberNames(repo: StudentRepo) {
  if (repo.members.length > 0) {
    return Array.from(
      new Set(
        repo.members
          .map((member) => member.studentName || member.studentKey)
          .map((value) => value?.trim())
          .filter(Boolean),
      ),
    );
  }
  const fallback = repo.studentName || repo.studentKey;
  return fallback ? [fallback] : [];
}

export function submissionMemberSummary(repo: StudentRepo) {
  const names = submissionMemberNames(repo);
  if (names.length === 0) {
    return repo.rosterGroupName
      ? "Team members not imported yet"
      : "No submitter linked yet";
  }
  if (names.length === 1) {
    return names[0];
  }
  return `${names.length} members: ${names.join(", ")}`;
}

export function submissionKindLabel(
  repo: StudentRepo,
  assignmentSubmissionKind?: SubmissionKind | null,
) {
  if (assignmentSubmissionKind === "group") {
    return "Team submission";
  }
  if (assignmentSubmissionKind === "individual") {
    return "Individual submission";
  }
  if (repo.members.length > 1 || repo.rosterGroupName) {
    return "Team submission";
  }
  if (repo.members.length === 1 || repo.studentName || repo.studentKey) {
    return "Individual submission";
  }
  return "Submission";
}

export function isGroupSubmission(repo: StudentRepo) {
  return repo.members.length > 1 || Boolean(repo.rosterGroupName);
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
