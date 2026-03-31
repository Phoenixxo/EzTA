import { useState } from "react";
import {
  FolderSearch,
  Layers3,
  LoaderCircle,
  RefreshCcw,
  WandSparkles,
} from "lucide-react";
import {
  discoverAssignmentGroups,
  listAssignmentGroupRepos,
  startRefreshOrgRepoIndexJob,
} from "../../lib/ezta";
import { useBackgroundJobMonitor } from "../../hooks/use-background-jobs";
import type {
  AssignmentDiscoveryGroup,
  AssignmentDiscoveryRepo,
  AssignmentForm,
  OrgRepoIndexStatus,
} from "../../types/ezta";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PanelShell } from "../workspace/panel-shell";

type AssignmentDiscoveryPanelProps = {
  onCreateAssignment: (form: AssignmentForm) => Promise<unknown>;
  busy: boolean;
  className?: string;
};

export function AssignmentDiscoveryPanel({
  onCreateAssignment,
  busy,
  className,
}: AssignmentDiscoveryPanelProps) {
  const [githubOrg, setGithubOrg] = useState("");
  const [groups, setGroups] = useState<AssignmentDiscoveryGroup[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [groupRepos, setGroupRepos] = useState<AssignmentDiscoveryRepo[]>([]);
  const [error, setError] = useState("");
  const [indexStatus, setIndexStatus] = useState<OrgRepoIndexStatus | null>(
    null,
  );
  const [discovering, setDiscovering] = useState(false);
  const [refreshingIndex, setRefreshingIndex] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [refreshJobId, setRefreshJobId] = useState<number | null>(null);

  useBackgroundJobMonitor<OrgRepoIndexStatus | null>({
    jobId: refreshJobId,
    onCleanup: () => {
      setRefreshJobId(null);
      setRefreshingIndex(false);
    },
    onFailed: (job) => {
      setError(job.error ?? "Org index refresh failed.");
      setIndexStatus(null);
    },
    onSettled: async (_, result) => {
      setIndexStatus(result ?? null);
    },
    onError: (err) => {
      setError(String(err));
      setIndexStatus(null);
    },
  });

  async function handleRefreshIndex() {
    if (!githubOrg.trim()) {
      setError("Enter a GitHub org to refresh the index.");
      return;
    }
    setRefreshingIndex(true);
    setError("");
    try {
      const job = await startRefreshOrgRepoIndexJob(githubOrg.trim());
      setRefreshJobId(job.id);
    } catch (err) {
      setError(String(err));
      setIndexStatus(null);
    }
  }

  async function handleDiscover() {
    if (!githubOrg.trim()) {
      setError("Enter a GitHub org to discover groups.");
      return;
    }
    setDiscovering(true);
    setError("");
    setSelectedGroupKey(null);
    setGroupRepos([]);
    try {
      const discovered = await discoverAssignmentGroups(githubOrg.trim());
      setGroups(discovered);
      if (discovered.length === 0) {
        setError("No assignment groups were detected for that org.");
      }
    } catch (err) {
      setError(String(err));
      setGroups([]);
    } finally {
      setDiscovering(false);
    }
  }

  async function handleOpenGroup(group: AssignmentDiscoveryGroup) {
    setSelectedGroupKey(group.groupKey);
    setLoadingRepos(true);
    setError("");
    try {
      const repos = await listAssignmentGroupRepos(
        group.githubOrg,
        group.groupKey,
      );
      setGroupRepos(repos);
    } catch (err) {
      setError(String(err));
      setGroupRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }

  async function handleCreateFromGroup(group: AssignmentDiscoveryGroup) {
    await onCreateAssignment({
      name: group.groupKey,
      githubOrg: group.githubOrg,
      repoPrefix: group.groupKey,
      repoTemplate: `${group.groupKey}-{github_username}`,
      deadlineAt: "",
    });
  }

  return (
    <PanelShell
      title="Discover Groups"
      subtitle="Find units first, then inspect the repos in a selected unit"
      className={className ?? "min-h-[calc(100vh-10rem)]"}
    >
      <div className="space-y-3 bg-white p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input
            value={githubOrg}
            onChange={(event) => setGithubOrg(event.currentTarget.value)}
            placeholder="GitHub org"
            className="h-10 rounded-none"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleRefreshIndex()}
            disabled={busy || discovering || refreshingIndex}
            className="h-10 shrink-0"
          >
            {refreshingIndex ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {refreshingIndex ? "Refreshing..." : "Refresh index"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleDiscover()}
            disabled={busy || discovering || refreshingIndex}
            className="h-10 shrink-0"
          >
            {discovering ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <FolderSearch className="h-4 w-4" />
            )}
            {discovering ? "Discovering..." : "Discover groups"}
          </Button>
        </div>

        {indexStatus ? (
          <div className="rounded-none border border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
            Indexed {indexStatus.repoCount} repos for {indexStatus.githubOrg}.
          </div>
        ) : null}

        {discovering ? (
          <div className="rounded-none border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            Reading cached org index and grouping repos into units...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-none border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
          <div className="min-h-0 space-y-2 overflow-y-auto rounded-none border border-zinc-300 bg-[#fbfbfa] p-3">
            {groups.map((group) => (
              <div
                key={`${group.githubOrg}-${group.groupKey}`}
                className="rounded-none border border-zinc-300 bg-[#fbfbfa] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900">
                      {group.groupKey}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {group.repoCount} repos
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Examples: {group.examples.join(", ")}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        selectedGroupKey === group.groupKey
                          ? "default"
                          : "outline"
                      }
                      onClick={() => void handleOpenGroup(group)}
                      disabled={busy || loadingRepos}
                    >
                      {loadingRepos && selectedGroupKey === group.groupKey ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Layers3 className="h-3.5 w-3.5" />
                      )}
                      {loadingRepos && selectedGroupKey === group.groupKey
                        ? "Loading..."
                        : "Open"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleCreateFromGroup(group)}
                      disabled={busy}
                    >
                      <WandSparkles className="h-3.5 w-3.5" />
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-none border border-zinc-300 bg-[#fbfbfa]">
            <div className="border-b border-zinc-300 px-4 py-3">
              <div className="text-sm font-semibold text-zinc-900">
                {selectedGroupKey ? `${selectedGroupKey} repos` : "Group repos"}
              </div>
              <div className="text-xs text-zinc-500">
                {selectedGroupKey
                  ? `${groupRepos.length} repos loaded for the selected group`
                  : "Select a group to load its repos"}
              </div>
            </div>
            <div className="max-h-128 overflow-y-auto p-3">
              {loadingRepos ? (
                <div className="rounded-none border border-zinc-200 bg-white px-3 py-4 text-sm text-zinc-500">
                  Loading repos for the selected group...
                </div>
              ) : null}
              {!loadingRepos && selectedGroupKey && groupRepos.length === 0 ? (
                <div className="rounded-none border border-zinc-200 bg-white px-3 py-4 text-sm text-zinc-500">
                  No repos found for this group.
                </div>
              ) : null}
              {!selectedGroupKey ? (
                <div className="rounded-none border border-dashed border-zinc-300 bg-white px-3 py-4 text-sm text-zinc-500">
                  Discover groups, then open one to inspect its repo list.
                </div>
              ) : null}
              <div className="space-y-2">
                {groupRepos.map((repo) => (
                  <div
                    key={repo.repoName}
                    className="rounded-none border border-zinc-200 bg-white px-3 py-3"
                  >
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {repo.repoName}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      Suffix: {repo.studentSuffix}
                    </div>
                    <div className="truncate text-xs text-zinc-400">
                      {repo.repoUrl}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
