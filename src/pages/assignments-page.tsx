import { useState } from "react";
import type { Assignment, AssignmentForm } from "../types/ezta";
import { Breadcrumbs } from "../components/navigation/breadcrumbs";
import { FileTabs } from "../components/navigation/file-tabs";
import { AssignmentCreateForm } from "../components/assignments/assignment-create-form";
import { AssignmentDiscoveryPanel } from "../components/assignments/assignment-discovery-panel";
import { AssignmentListPanel } from "../components/assignments/assignment-list-panel";

type AssignmentsPageProps = {
  assignments: Assignment[];
  selectedAssignmentId: number | null;
  onSelectAssignment: (assignmentId: number) => void;
  onOpenAssignment: (assignmentId: number) => void;
  onCreateAssignment: (form: AssignmentForm) => Promise<unknown>;
  onDeleteAssignment: (assignmentId: number, deleteLocalWorkspace?: boolean) => Promise<void> | void;
  busy: boolean;
};

export function AssignmentsPage({
  assignments,
  selectedAssignmentId,
  onSelectAssignment,
  onOpenAssignment,
  onCreateAssignment,
  onDeleteAssignment,
  busy,
}: AssignmentsPageProps) {
  const [tab, setTab] = useState<"discover" | "create">("discover");

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <Breadcrumbs items={[{ label: "Assignments" }]} />
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)]">
        <AssignmentListPanel
          assignments={assignments}
          selectedAssignmentId={selectedAssignmentId}
          onSelectAssignment={onSelectAssignment}
          onOpenAssignment={onOpenAssignment}
          onDeleteAssignment={onDeleteAssignment}
          busy={busy}
        />

        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
          <FileTabs
            tabs={["discover", "create"] as const}
            activeTab={tab}
            onTabChange={setTab}
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
      </div>
    </div>
  );
}
