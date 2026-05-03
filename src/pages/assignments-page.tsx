import { useState } from "react";
import type { Assignment, AssignmentForm } from "../types/ezta";
import { FileTabs } from "../components/navigation/file-tabs";
import { AssignmentCreateForm } from "../components/assignments/assignment-create-form";
import { AssignmentDiscoveryPanel } from "../components/assignments/assignment-discovery-panel";

type AssignmentsPageProps = {
  assignments: Assignment[];
  selectedAssignmentId: number | null;
  onSelectAssignment: (assignmentId: number) => void;
  onOpenAssignment: (assignmentId: number) => void;
  onCreateAssignment: (form: AssignmentForm) => Promise<unknown>;
  onDeleteAssignment: (
    assignmentId: number,
    deleteLocalWorkspace?: boolean,
  ) => Promise<void> | void;
  busy: boolean;
};

export function AssignmentsPage({
  onCreateAssignment,
  busy,
}: AssignmentsPageProps) {
  const [tab, setTab] = useState<"discover" | "create">("discover");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <FileTabs
        tabs={["discover", "create"] as const}
        activeTab={tab}
        onTabChange={setTab}
        labels={{ discover: "Discover from GitHub", create: "New assignment" }}
      />

      {tab === "discover" ? (
        <AssignmentDiscoveryPanel
          onCreateAssignment={onCreateAssignment}
          busy={busy}
          className="min-h-0 flex-1 rounded-t-none border-t-0"
        />
      ) : null}

      {tab === "create" ? (
        <AssignmentCreateForm
          onCreateAssignment={onCreateAssignment}
          busy={busy}
          className="min-h-0 flex-1 rounded-t-none border-t-0"
        />
      ) : null}
    </div>
  );
}
