import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import type { AssignmentForm } from "../../types/ezta";
import { emptyAssignmentForm } from "../../types/ezta";
import {
  getRepoTemplateHelpText,
  previewRepoTemplate,
  validateRepoTemplate,
} from "../../lib/assignment-template";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PanelShell } from "../workspace/panel-shell";

type AssignmentCreateFormProps = {
  onCreateAssignment: (form: AssignmentForm) => Promise<unknown>;
  busy: boolean;
  className?: string;
};

export function AssignmentCreateForm({
  onCreateAssignment,
  busy,
  className,
}: AssignmentCreateFormProps) {
  const [form, setForm] = useState<AssignmentForm>(emptyAssignmentForm);
  const templateError = validateRepoTemplate(form.repoTemplate);
  const templatePreview = previewRepoTemplate(form.repoTemplate, {
    assignmentName: form.name,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (templateError) {
      return;
    }
    const created = await onCreateAssignment(form);
    if (created) {
      setForm(emptyAssignmentForm);
    }
  }

  return (
    <PanelShell
      title="Create Assignment"
      subtitle="Create a new queue and review workspace"
      className={className ?? "min-h-0"}
    >
      <form className="grid gap-3 bg-white p-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <Input
          value={form.name}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setForm((current) => ({ ...current, name: value }));
          }}
          placeholder="Assignment name"
          required
          className="h-10 rounded-none"
        />
        <Input
          value={form.githubOrg}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setForm((current) => ({ ...current, githubOrg: value }));
          }}
          placeholder="GitHub org"
          required
          className="h-10 rounded-none"
        />
        <Input
          value={form.repoPrefix}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setForm((current) => ({ ...current, repoPrefix: value }));
          }}
          placeholder="Optional repo prefix"
          className="h-10 rounded-none"
        />
        <Input
          value={form.repoTemplate}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setForm((current) => ({ ...current, repoTemplate: value }));
          }}
          placeholder="unit10-{github_username}"
          className="h-10 rounded-none"
        />
        <div className="space-y-2 md:col-span-2">
          <div className="border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {getRepoTemplateHelpText()}
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
          value={form.deadlineAt}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setForm((current) => ({ ...current, deadlineAt: value }));
          }}
          className="h-10 rounded-none"
        />
        <Button type="submit" disabled={busy || Boolean(templateError)} className="h-10">
          <Plus className="h-4 w-4" />
          Create queue
        </Button>
      </form>
    </PanelShell>
  );
}
