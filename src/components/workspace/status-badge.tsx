import { Badge } from "../ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "prepared"
      ? "info"
      : status === "reviewed"
        ? "success"
        : status === "error"
          ? "danger"
          : "neutral";

  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
