import { Badge } from "./ui";

const LABELS: Record<string, string> = {
  processed: "Processed",
  needs_review: "Needs review",
  failed: "Failed",
  processing: "Processing",
  running: "Running",
  queued: "Queued",
  uploaded: "Uploaded",
  succeeded: "Succeeded",
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "processed" || status === "succeeded"
      ? "civic"
      : status === "needs_review"
        ? "gold"
        : status === "failed"
          ? "rust"
          : status === "processing" || status === "running"
            ? "blue"
            : "neutral";
  return <Badge tone={tone}>{LABELS[status] || status.replaceAll("_", " ")}</Badge>;
}
