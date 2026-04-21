import type { QueueSort, ReviewStatusFilter, StudentRepo } from "../types/ezta";
import { submissionDisplayName, submissionMemberSummary } from "./format";

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
      repo.rosterGroupName ?? "",
      repo.studentKey,
      repo.studentName,
      repo.repoOwner,
      repo.repoName,
      repo.githubUsername ?? "",
      repo.githubId ?? "",
      submissionDisplayName(repo),
      submissionMemberSummary(repo),
      ...repo.members.map((member) =>
        [member.studentKey, member.studentName, member.githubUsername ?? "", member.githubId ?? ""]
          .join(" "),
      ),
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
        return `${left.reviewStatus}:${submissionDisplayName(left)}:${left.repoName}`.localeCompare(
          `${right.reviewStatus}:${submissionDisplayName(right)}:${right.repoName}`,
        );
      case "updated":
        return (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
      case "student":
      default:
        return `${submissionDisplayName(left)}:${left.repoName}`.localeCompare(
          `${submissionDisplayName(right)}:${right.repoName}`,
        );
    }
  });
}
