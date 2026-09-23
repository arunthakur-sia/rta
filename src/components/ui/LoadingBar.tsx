import { cn } from "@/lib/utils";

/** Indeterminate progress bar — a sliding segment, for waits with no real percentage to report. */
export function LoadingBar({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-accent-300/40", className)}>
      <div className="animate-loading-bar absolute inset-y-0 rounded-full bg-accent-500" />
    </div>
  );
}
