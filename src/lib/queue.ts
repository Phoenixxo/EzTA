import type { QueueSort, ReviewStatusFilter, StudentRepo } from "../types/ezta";

export function filterAndSortRepos(
  repos: StudentRepo[],
  statusFilter: ReviewStatusFilter,
  repoQuery: string,
  queueSort: QueueSort,
) {
  const matchingRepos = repos.filter((repo) => {
    const matchesStatus = statusFilter === "all" || repo.reviewStatus === statusFilter;
    const query = repoQuery.trim().toLowerCase();
    if (!query) {
      return matchesStatus;
    }
    const haystack = [
      repo.studentKey,
      repo.studentName,
      repo.repoOwner,
      repo.repoName,
      repo.baseSha ?? "",
      repo.submissionSha ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return matchesStatus && haystack.includes(query);
  });

  return [...matchingRepos].sort((left, right) => {
    switch (queueSort) {
      case "repo":
        return `${left.repoOwner}/${left.repoName}`.localeCompare(
          `${right.repoOwner}/${right.repoName}`,
        );
      case "status":
        return `${left.reviewStatus}:${left.studentKey}:${left.repoName}`.localeCompare(
          `${right.reviewStatus}:${right.studentKey}:${right.repoName}`,
        );
      case "updated":
        return (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
      case "student":
      default:
        return `${left.studentKey}:${left.studentName}:${left.repoName}`.localeCompare(
          `${right.studentKey}:${right.studentName}:${right.repoName}`,
        );
    }
  });
}
