import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const [mode, setMode] = useState<"write" | "preview">("write");

  useEffect(() => {
    setMode("write");
  }, [locked]);

  return (
    <div className="rounded-md border border-stone-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
        <span>
          {comment.side} lines {comment.startLine}-{comment.lineNumber}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-semibold",
            comment.publishStatus === "published"
              ? "text-emerald-700"
              : comment.publishStatus === "queued_for_review"
                ? "text-sky-700"
                : comment.publishStatus === "failed_to_map"
                  ? "text-red-700"
                  : "text-amber-700",
          )}
        >
          {comment.publishStatus === "published"
            ? "Published"
            : comment.publishStatus === "queued_for_review"
              ? "Queued"
              : comment.publishStatus === "failed_to_map"
                ? "Failed to map"
                : "Draft"}
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
          className="mb-2 inline-flex text-xs text-stone-600 underline"
        >
          Open published comment
        </a>
      ) : null}
      {comment.githubReviewUrl &&
      comment.publishStatus === "queued_for_review" ? (
        <a
          href={comment.githubReviewUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-2 inline-flex text-xs text-stone-600 underline"
        >
          Open pending review
        </a>
      ) : null}
      {locked ? (
        <div className="mb-2 border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          This comment is queued in a pending review. Submit or discard the
          review before editing it.
        </div>
      ) : null}
      <div className="mb-2 grid min-w-0 gap-2 md:grid-cols-[100px_100px_minmax(0,1fr)]">
        <Input
          value={startLine}
          onChange={(event) => setStartLine(event.currentTarget.value)}
          className="h-9 min-w-0"
          disabled={locked}
        />
        <Input
          value={lineNumber}
          onChange={(event) => setLineNumber(event.currentTarget.value)}
          className="h-9 min-w-0"
          disabled={locked}
        />
        <select
          value={side}
          onChange={(event) => setSide(event.currentTarget.value)}
          className="h-9 min-w-0 rounded-md border border-stone-200 bg-white px-3 text-sm"
          disabled={locked}
        >
          <option value="submission">submission</option>
          <option value="base">base</option>
        </select>
      </div>
      <div className="flex items-center gap-1 mb-1.5">
        <button
          type="button"
          onClick={() => setMode("write")}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            mode === "write"
              ? "bg-stone-900 text-white"
              : "text-stone-500 hover:bg-stone-100",
          )}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            mode === "preview"
              ? "bg-stone-900 text-white"
              : "text-stone-500 hover:bg-stone-100",
          )}
        >
          Preview
        </button>
        <span className="ml-auto text-[10px] text-stone-400 font-mono">MD</span>
      </div>
      {mode === "write" ? (
        <Textarea
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          rows={4}
          className=""
          disabled={locked}
        />
      ) : (
        <div className="min-h-[96px] rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm [&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_pre]:bg-stone-900 [&_pre]:text-stone-100 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_li]:mb-0.5 [&_a]:text-violet-600 [&_a]:underline [&_strong]:font-semibold [&_blockquote]:border-l-[3px] [&_blockquote]:border-stone-300 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-stone-600 [&_blockquote]:italic [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_table]:border-collapse [&_table]:w-full [&_table]:text-xs [&_th]:border [&_th]:border-stone-300 [&_th]:bg-stone-100 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-stone-200 [&_td]:px-2 [&_td]:py-1">
          {body.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          ) : (
            <span className="text-stone-400 italic">Nothing to preview.</span>
          )}
        </div>
      )}
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onSave({
              body,
              startLine: Math.min(
                Number(startLine) || 1,
                Number(lineNumber) || 1,
              ),
              lineNumber: Math.max(
                Number(startLine) || 1,
                Number(lineNumber) || 1,
              ),
              side,
            })
          }
          disabled={locked}
          className="min-w-0"
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={onDelete}
          disabled={locked}
          className="min-w-0"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
