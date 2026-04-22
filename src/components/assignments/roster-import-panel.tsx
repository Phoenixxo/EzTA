import { ChangeEvent, useRef, useState } from "react";
import { FileUp, FolderSync } from "lucide-react";
import type { Assignment } from "../../types/ezta";
import { previewRepoTemplate } from "../../lib/assignment-template";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { PanelShell } from "../workspace/panel-shell";

type RosterImportPanelProps = {
  assignment: Assignment | null;
  repoTemplate: string;
  rosterInput: string;
  onRosterInputChange: (value: string) => void;
  onImportRoster: () => void;
  onSyncAssignment: () => void;
  busy: boolean;
  className?: string;
};

export function RosterImportPanel({
  assignment,
  repoTemplate,
  rosterInput,
  onRosterInputChange,
  onImportRoster,
  onSyncAssignment,
  busy,
  className,
}: RosterImportPanelProps) {
  const [rosterFileName, setRosterFileName] = useState("");
  const [rosterFileError, setRosterFileError] = useState("");
  const rosterFileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleRosterFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    const normalizedName = file.name.trim().toLowerCase();
    if (!normalizedName.endsWith(".csv")) {
      setRosterFileName("");
      setRosterFileError("Only .csv roster files are supported.");
      event.currentTarget.value = "";
      return;
    }

    const content = await file.text();
    setRosterFileError("");
    setRosterFileName(file.name);
    onRosterInputChange(content);
    event.currentTarget.value = "";
  }

  const rosterLines = rosterInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const previewRow = rosterLines.length > 1 ? rosterLines[1].split(",") : [];
  const previewRepoName = previewRepoTemplate(repoTemplate, {
    assignmentName: assignment?.name ?? "unit10",
    identifier: previewRow[0]?.trim() || "s1234567",
    githubUsername: previewRow[1]?.trim() || "octocat",
    studentName: previewRow[3]?.trim() || "Jane Student",
    groupName: previewRow[4]?.trim() || "group-a",
  });

  return (
    <PanelShell
      title="Roster Import"
      subtitle={assignment ? assignment.name : "No assignment selected"}
      className={className}
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={onSyncAssignment}
          disabled={!assignment || busy}
        >
          <FolderSync className="h-3.5 w-3.5" />
          Sync repos
        </Button>
      }
    >
      <div className="space-y-3 bg-white p-4">
        <div className="border border-zinc-300 bg-zinc-50 px-3 py-3 text-xs text-zinc-700">
          <div className="font-semibold uppercase tracking-[0.12em] text-zinc-900">
            UPLOAD ROSTER FILE HERE
          </div>
          <div className="font-bold mt-1 leading-5">
            Supported File Types: CSV
            <br />
          </div>
        </div>
        <input
          ref={rosterFileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => void handleRosterFileChange(event)}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => rosterFileInputRef.current?.click()}
          disabled={!assignment || busy}
        >
          <FileUp className="h-3.5 w-3.5" />
          Choose roster file
        </Button>
        {rosterFileName ? (
          <div className="rounded-none border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            Loaded file: {rosterFileName}
          </div>
        ) : null}
        {rosterFileError ? (
          <div className="rounded-none border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {rosterFileError}
          </div>
        ) : null}
        <div className="border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700">
          Repo preview from current template:
          <span className="ml-2 font-mono text-zinc-900">
            {previewRepoName}
          </span>
        </div>
        <Textarea
          value={rosterInput}
          onChange={(event) => onRosterInputChange(event.currentTarget.value)}
          rows={12}
          className="rounded-none text-xs"
          placeholder="GitHub Classroom CSV: identifier, github_username, github_id, name, group_name"
          disabled={!assignment}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onImportRoster}
          disabled={!assignment || busy || !rosterInput.trim()}
        >
          Import roster
        </Button>
      </div>
    </PanelShell>
  );
}
