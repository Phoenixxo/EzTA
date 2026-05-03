import { useEffect, useMemo, useState } from "react";
import { cn } from "../../../lib/utils";
import type { DraftComment } from "../../../types/ezta";
import {
  diffLineToneClass,
  parseUnifiedDiff,
  selectionForDiffLine,
} from "../lib/diff-view";

type StructuredDiffPaneProps = {
  diff: string;
  comments: DraftComment[];
  draftSide: string;
  selectedStartLine: number;
  selectedEndLine: number;
  onSelectionChange: (
    side: "base" | "submission",
    startLine: number,
    endLine: number,
  ) => void;
};

export function StructuredDiffPane({
  diff,
  comments,
  draftSide,
  selectedStartLine,
  selectedEndLine,
  onSelectionChange,
}: StructuredDiffPaneProps) {
  const parsed = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const [dragAnchor, setDragAnchor] = useState<{
    side: "base" | "submission";
    line: number;
  } | null>(null);

  useEffect(() => {
    if (!dragAnchor) {
      return;
    }
    function handleMouseUp() {
      setDragAnchor(null);
    }
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragAnchor]);

  if (parsed.hunks.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-auto bg-stone-50 p-4 text-xs leading-5 text-stone-800">
        No diff loaded for this file.
      </div>
    );
  }

  return (
    <div
      className="min-h-0 flex-1 overflow-auto bg-stone-50 select-none"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-stone-500">
        Click or drag lines to set comment range · Side: {draftSide}
      </div>
      <div className="font-mono text-xs leading-5 text-stone-800">
        {parsed.hunks.map((hunk, hunkIndex) => (
          <div
            key={`${hunk.header}-${hunkIndex}`}
            className="border-b border-stone-300"
          >
            <div className="border-b border-stone-200 bg-stone-100 px-4 py-2 text-[11px] font-semibold text-stone-600">
              {hunk.header}
            </div>
            {hunk.lines.map((line, lineIndex) => {
              const selection = selectionForDiffLine(line, draftSide);
              const activeSelection =
                selection &&
                selection.side === draftSide &&
                selection.lineNumber >=
                  Math.min(selectedStartLine, selectedEndLine) &&
                selection.lineNumber <=
                  Math.max(selectedStartLine, selectedEndLine);
              const matchingComments = selection
                ? comments.filter(
                    (comment) =>
                      comment.side === selection.side &&
                      selection.lineNumber >= comment.startLine &&
                      selection.lineNumber <= comment.lineNumber,
                  )
                : [];
              const toneClass = diffLineToneClass(
                line.type,
                matchingComments,
                Boolean(activeSelection),
              );

              return (
                <div
                  key={`${hunkIndex}-${lineIndex}`}
                  className={cn(
                    "grid grid-cols-[3.5rem_3.5rem_minmax(0,1fr)] border-b border-stone-100",
                    toneClass,
                    selection ? "cursor-pointer" : "cursor-default",
                  )}
                  onMouseDown={() => {
                    if (!selection) {
                      return;
                    }
                    setDragAnchor({
                      side: selection.side,
                      line: selection.lineNumber,
                    });
                    onSelectionChange(
                      selection.side,
                      selection.lineNumber,
                      selection.lineNumber,
                    );
                  }}
                  onMouseEnter={() => {
                    if (
                      !selection ||
                      !dragAnchor ||
                      dragAnchor.side !== selection.side
                    ) {
                      return;
                    }
                    onSelectionChange(
                      dragAnchor.side,
                      dragAnchor.line,
                      selection.lineNumber,
                    );
                  }}
                >
                  <div className="border-r border-stone-200 px-2 py-0.5 text-right text-[11px] text-stone-500">
                    {line.oldNumber ?? ""}
                  </div>
                  <div className="border-r border-stone-200 px-2 py-0.5 text-right text-[11px] text-stone-500">
                    {line.newNumber ?? ""}
                  </div>
                  <div className="flex min-w-0 items-start justify-between gap-3 px-3 py-0.5">
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">
                      <span className="mr-2 inline-block w-3 text-stone-400">
                        {line.prefix}
                      </span>
                      {line.content || " "}
                    </span>
                    {selection ? (
                      <span className="shrink-0 border border-stone-300 bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-stone-600">
                        {selection.side}
                        {matchingComments.length > 0
                          ? ` · ${matchingComments.length} comment${matchingComments.length > 1 ? "s" : ""}`
                          : ""}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
