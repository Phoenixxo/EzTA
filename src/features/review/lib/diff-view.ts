import type { DraftComment } from "../../../types/ezta";

export type ParsedDiffLine = {
  type: "context" | "add" | "remove";
  prefix: string;
  content: string;
  oldNumber: number | null;
  newNumber: number | null;
};

export type ParsedDiffHunk = {
  header: string;
  lines: ParsedDiffLine[];
};

export function parseUnifiedDiff(diff: string): { hunks: ParsedDiffHunk[] } {
  const lines = diff.split("\n");
  const hunks: ParsedDiffHunk[] = [];
  let currentHunk: ParsedDiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      oldLine = match ? Number(match[1]) : 0;
      newLine = match ? Number(match[2]) : 0;
      currentHunk = { header: line, lines: [] };
      hunks.push(currentHunk);
      continue;
    }
    if (!currentHunk) {
      continue;
    }
    if (line.startsWith("\\ No newline")) {
      continue;
    }
    const prefix = line[0] ?? " ";
    const content = line.slice(1);
    if (prefix === "+") {
      currentHunk.lines.push({
        type: "add",
        prefix,
        content,
        oldNumber: null,
        newNumber: newLine,
      });
      newLine += 1;
    } else if (prefix === "-") {
      currentHunk.lines.push({
        type: "remove",
        prefix,
        content,
        oldNumber: oldLine,
        newNumber: null,
      });
      oldLine += 1;
    } else {
      currentHunk.lines.push({
        type: "context",
        prefix: " ",
        content: prefix === " " ? content : line,
        oldNumber: oldLine,
        newNumber: newLine,
      });
      oldLine += 1;
      newLine += 1;
    }
  }

  return { hunks };
}

export function selectionForDiffLine(
  line: ParsedDiffLine,
  draftSide: string,
): { side: "base" | "submission"; lineNumber: number } | null {
  if (line.type === "add" && line.newNumber) {
    return { side: "submission", lineNumber: line.newNumber };
  }
  if (line.type === "remove" && line.oldNumber) {
    return { side: "base", lineNumber: line.oldNumber };
  }
  if (line.type === "context") {
    if (draftSide === "base" && line.oldNumber) {
      return { side: "base", lineNumber: line.oldNumber };
    }
    if (draftSide === "submission" && line.newNumber) {
      return { side: "submission", lineNumber: line.newNumber };
    }
  }
  return null;
}

export function lineToneClass(comments: DraftComment[], isSelected: boolean) {
  if (comments.some((comment) => comment.publishStatus === "failed_to_map")) {
    return "bg-red-100";
  }
  if (comments.some((comment) => comment.publishStatus === "queued_for_review")) {
    return isSelected ? "bg-amber-100" : "bg-amber-50";
  }
  if (comments.some((comment) => comment.publishStatus === "published")) {
    return isSelected ? "bg-emerald-100" : "bg-emerald-50";
  }
  if (comments.some((comment) => comment.publishStatus === "draft")) {
    return isSelected ? "bg-amber-100" : "bg-amber-50";
  }
  if (isSelected) {
    return "bg-zinc-100";
  }
  return "bg-transparent";
}

export function diffLineToneClass(
  lineType: "context" | "add" | "remove",
  comments: DraftComment[],
  isSelected: boolean,
) {
  if (comments.some((comment) => comment.publishStatus === "failed_to_map")) {
    return "bg-red-100";
  }
  if (comments.some((comment) => comment.publishStatus === "queued_for_review")) {
    return isSelected ? "bg-amber-100" : "bg-amber-50";
  }
  if (comments.some((comment) => comment.publishStatus === "published")) {
    return isSelected ? "bg-emerald-100" : "bg-emerald-50";
  }
  if (comments.some((comment) => comment.publishStatus === "draft")) {
    return isSelected ? "bg-amber-100" : "bg-amber-50";
  }
  if (isSelected) {
    return "bg-zinc-100";
  }
  if (lineType === "add") {
    return "bg-emerald-50";
  }
  if (lineType === "remove") {
    return "bg-red-50";
  }
  return "bg-transparent";
}

export function groupChangedFiles(
  files: { path: string; previousPath: string | null; status: string }[],
) {
  const groups = new Map<string, typeof files>();
  for (const file of files) {
    const label = dirname(file.path);
    const current = groups.get(label) ?? [];
    current.push(file);
    groups.set(label, current);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, grouped]) => ({
      label,
      files: [...grouped].sort((left, right) => left.path.localeCompare(right.path)),
    }));
}

export function dirname(path: string) {
  const parts = path.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "root";
}

export function basename(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}
