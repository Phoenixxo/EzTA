import { Trash2 } from "lucide-react";
import type { Assignment } from "../../types/ezta";
import {
  getRepoTemplateHelpText,
  previewRepoTemplate,
  validateRepoTemplate,
} from "../../lib/assignment-template";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PanelShell } from "../workspace/panel-shell";

type AssignmentSettingsPanelProps = {
  assignment: Assignment | null;
  repoTemplateInput: string;
  onRepoTemplateInputChange: (value: string) => void;
  deadlineInput: string;
  onDeadlineInputChange: (value: string) => void;
  submissionKindInput: "individual" | "group";
  onSubmissionKindInputChange: (value: "individual" | "group") => void;
  onSave: () => void;
  onDelete: (deleteLocalWorkspace?: boolean) => Promise<void> | void;
  busy: boolean;
  className?: string;
};

export function AssignmentSettingsPanel({
  assignment,
  repoTemplateInput,
  onRepoTemplateInputChange,
  deadlineInput,
  onDeadlineInputChange,
  submissionKindInput,
  onSubmissionKindInputChange,
  onSave,
  onDelete,
  busy,
  className,
}: AssignmentSettingsPanelProps) {
  const templateError = validateRepoTemplate(repoTemplateInput, submissionKindInput);
  const templatePreview = previewRepoTemplate(repoTemplateInput, {
    assignmentName: assignment?.name ?? "unit10",
  });

  return (
    <PanelShell
      title="Assignment Settings"
      subtitle={assignment ? assignment.name : "No assignment selected"}
      className={className}
    >
      <div className="space-y-3 bg-white p-4">
        <select
          value={submissionKindInput}
          onChange={(event) =>
            onSubmissionKindInputChange(event.currentTarget.value as "individual" | "group")
          }
          className="h-10 w-full rounded-none border border-zinc-300 bg-white px-3 text-sm"
          disabled={!assignment}
        >
          <option value="individual">Individual assignment</option>
          <option value="group">Group assignment</option>
        </select>
        <Input
          value={repoTemplateInput}
          onChange={(event) => onRepoTemplateInputChange(event.currentTarget.value)}
          className="h-10 rounded-none"
          placeholder="unit10-{github_username}"
          disabled={!assignment}
        />
        <div className="space-y-2">
          <div className="border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {getRepoTemplateHelpText(submissionKindInput)}
          </div>
          <div className="border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700">
            Preview: <span className="font-mono text-zinc-900">{templatePreview}</span>
          </div>
          {templateError ? (
            <div className="border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
              {templateError}
            </div>
          ) : null}
        </div>
        <Input
          type="datetime-local"
          value={deadlineInput}
          onChange={(event) => onDeadlineInputChange(event.currentTarget.value)}
          className="h-10 rounded-none"
          disabled={!assignment}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={!assignment || busy || Boolean(templateError)}
          >
            Save settings
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => void onDelete(false)}
            disabled={!assignment || busy}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete queue
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => void onDelete(true)}
            disabled={!assignment || busy}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete queue + clones
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}
