import { useState } from "react";
import { cn } from "../../../lib/utils";
import type { DraftComment } from "../../../types/ezta";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";

type DraftCommentRowProps = {
  comment: DraftComment;
  onSave: (input: {
    body: string;
    startLine: number;
    lineNumber: number;
    side: string;
  }) => void;
  onDelete: () => void;
  locked: boolean;
};

export function DraftCommentRow({
  comment,
  onSave,
  onDelete,
  locked,
}: DraftCommentRowProps) {
  const [body, setBody] = useState(comment.body);
  const [startLine, setStartLine] = useState(String(comment.startLine));
  const [lineNumber, setLineNumber] = useState(String(comment.lineNumber));
  const [side, setSide] = useState(comment.side);

  return (
    <div className="rounded-none border border-zinc-300 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <span>
          {comment.side} lines {comment.startLine}-{comment.lineNumber}
        </span>
        <span
          className={cn(
            "border px-1.5 py-0.5",
            comment.publishStatus === "published"
              ? "border-emerald-700 bg-emerald-100 text-emerald-900"
              : comment.publishStatus === "queued_for_review"
                ? "border-amber-700 bg-amber-100 text-amber-900"
                : comment.publishStatus === "failed_to_map"
                  ? "border-red-700 bg-red-100 text-red-900"
                  : "border-zinc-300 bg-zinc-100 text-zinc-700",
          )}
        >
          {comment.publishStatus.replace(/_/g, " ")}
        </span>
      </div>
      {comment.lastError ? (
        <div className="mb-2 border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">
          {comment.lastError}
        </div>
      ) : null}
      {comment.githubCommentUrl ? (
        <a
          href={comment.githubCommentUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-2 inline-flex text-xs text-zinc-700 underline"
        >
          Open published comment
        </a>
      ) : null}
      {comment.githubReviewUrl && comment.publishStatus === "queued_for_review" ? (
        <a
          href={comment.githubReviewUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-2 inline-flex text-xs text-zinc-700 underline"
        >
          Open pending review
        </a>
      ) : null}
      {locked ? (
        <div className="mb-2 border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          This comment is queued in a pending review. Submit or discard the review before editing it.
        </div>
      ) : null}
      <div className="mb-2 grid gap-2 xl:grid-cols-[100px_100px_1fr]">
        <Input
          value={startLine}
          onChange={(event) => setStartLine(event.currentTarget.value)}
          className="h-9 rounded-none"
          disabled={locked}
        />
        <Input
          value={lineNumber}
          onChange={(event) => setLineNumber(event.currentTarget.value)}
          className="h-9 rounded-none"
          disabled={locked}
        />
        <select
          value={side}
          onChange={(event) => setSide(event.currentTarget.value)}
          className="h-9 rounded-none border border-zinc-300 bg-white px-3 text-sm"
          disabled={locked}
        >
          <option value="submission">submission</option>
          <option value="base">base</option>
        </select>
      </div>
      <Textarea
        value={body}
        onChange={(event) => setBody(event.currentTarget.value)}
        rows={4}
        className="rounded-none"
        disabled={locked}
      />
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onSave({
              body,
              startLine: Math.min(Number(startLine) || 1, Number(lineNumber) || 1),
              lineNumber: Math.max(Number(startLine) || 1, Number(lineNumber) || 1),
              side,
            })
          }
          disabled={locked}
        >
          Save
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={onDelete} disabled={locked}>
          Delete
        </Button>
      </div>
    </div>
  );
}
