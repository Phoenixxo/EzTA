import { Badge } from "../ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "prepared"
      ? "success"
      : status === "reviewed"
        ? "warning"
        : status === "error"
          ? "danger"
          : "neutral";

  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
