import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Assignment } from "../../types/ezta";
import { Button } from "../ui/button";
import { PanelShell } from "../workspace/panel-shell";
import { cn } from "../../lib/utils";

type AssignmentListPanelProps = {
  assignments: Assignment[];
  selectedAssignmentId: number | null;
  onSelectAssignment: (assignmentId: number) => void;
  onOpenAssignment: (assignmentId: number) => void;
  onDeleteAssignment: (
    assignmentId: number,
    deleteLocalWorkspace?: boolean,
  ) => Promise<void> | void;
  busy: boolean;
};

export function AssignmentListPanel({
  assignments,
  selectedAssignmentId,
  onSelectAssignment,
  onOpenAssignment,
  onDeleteAssignment,
  busy,
}: AssignmentListPanelProps) {
  const [pendingDelete, setPendingDelete] = useState<{
    assignmentId: number;
    deleteLocalWorkspace: boolean;
  } | null>(null);

  async function handleDelete(
    assignmentId: number,
    deleteLocalWorkspace: boolean,
  ) {
    await onDeleteAssignment(assignmentId, deleteLocalWorkspace);
    setPendingDelete(null);
  }

  return (
    <PanelShell
      title="Assignments"
      subtitle={`${assignments.length} queue${assignments.length === 1 ? "" : "s"}`}
      className="h-full min-h-0"
    >
      <div className="min-h-0 space-y-2 overflow-y-auto bg-stone-50 p-3">
        {assignments.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-300 bg-white px-4 py-8 text-sm text-stone-500">
            Create an assignment to start using the dashboard flow.
          </div>
        ) : null}

        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            role="button"
            tabIndex={0}
            className={cn(
              "rounded-md border p-3 text-left transition-colors outline-none focus-visible:ring-1 focus-visible:ring-stone-500",
              assignment.id === selectedAssignmentId
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-stone-200 bg-white hover:bg-stone-50",
            )}
            onClick={() => onSelectAssignment(assignment.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectAssignment(assignment.id);
              }
            }}
          >
            <div className="truncate text-sm font-semibold">
              {assignment.name}
            </div>
            <div className="truncate text-xs opacity-70">
              {assignment.githubOrg}
            </div>
            <div className="truncate text-xs opacity-70">
              {assignment.submissionKind === "group"
                ? "Group assignment"
                : "Individual assignment"}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={
                  assignment.id === selectedAssignmentId
                    ? "default"
                    : "secondary"
                }
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenAssignment(assignment.id);
                }}
              >
                Open dashboard
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDelete({
                    assignmentId: assignment.id,
                    deleteLocalWorkspace: false,
                  });
                }}
                disabled={busy}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
            {pendingDelete?.assignmentId === assignment.id ? (
              <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-3 text-xs text-red-800">
                <div className="font-semibold uppercase tracking-[0.12em]">
                  Confirm delete
                </div>
                <div className="mt-1 leading-5">
                  Delete{" "}
                  <span className="font-semibold">{assignment.name}</span> from
                  EzTA?
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(assignment.id, false);
                    }}
                    disabled={busy}
                  >
                    Delete queue
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(assignment.id, true);
                    }}
                    disabled={busy}
                  >
                    Delete + clones
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDelete(null);
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
