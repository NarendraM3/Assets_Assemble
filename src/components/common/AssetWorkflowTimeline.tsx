import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";
import type { AssetStatus } from "@/types/domain";

const CORE_STEPS: { key: string; label: string }[] = [
  { key: "Requested", label: "Admin Approved" },
  { key: "Approved", label: "Asset Manager Approved" },
  { key: "Reserved", label: "Asset Reserved" },
  { key: "Ready for Pickup", label: "Ready for Pickup" },
  { key: "Assigned", label: "Assigned" },
  { key: "Delivered", label: "Delivered" },
];

const STATUS_ORDER: Record<AssetStatus, number> = {
  Requested: 0,
  Approved: 1,
  "Ready for Pickup": 3,
  Assigned: 4,
  Delivered: 5,
  Returned: 6,
  "Under Maintenance": 6,
  "Out of Stock": -1,
  Available: -1,
  Maintenance: -1,
  Retired: -1,
};

function getStepState(
  stepIndex: number,
  currentStatus: AssetStatus,
): "completed" | "current" | "pending" {
  const currentIdx = STATUS_ORDER[currentStatus] ?? -1;
  if (currentStatus === "Returned") {
    return stepIndex <= 4 ? "completed" : "pending";
  }
  if (currentStatus === "Under Maintenance") {
    if (stepIndex < 3) return "completed";
    if (stepIndex === 3) return "current";
    return "pending";
  }
  if (stepIndex < currentIdx) return "completed";
  if (stepIndex === currentIdx) return "current";
  return "pending";
}

export function AssetWorkflowTimeline({ status }: { status: AssetStatus }) {
  const showReturned = status === "Returned";
  const showMaintenance = status === "Under Maintenance";

  return (
    <div className="space-y-0">
      {CORE_STEPS.map((step, i) => {
        const state = getStepState(i, status);
        return (
          <div key={step.key} className="flex items-start gap-3 relative">
            {i < CORE_STEPS.length - 1 && (
              <div
                className={cn(
                  "absolute left-[11px] top-6 w-0.5 h-8",
                  state === "completed" || (status === "Returned" && i <= 3)
                    ? "bg-green-500"
                    : state === "current"
                      ? "bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600",
                )}
              />
            )}
            <div className="flex items-center gap-3 py-1.5">
              <div
                className={cn(
                  "h-6 w-6 rounded-full grid place-items-center shrink-0 transition-colors",
                  state === "completed" && "bg-green-500 text-white",
                  state === "current" && "bg-blue-500 text-white ring-4 ring-blue-500/20",
                  state === "pending" && "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500",
                )}
              >
                {state === "completed" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  state === "completed" && "text-green-600 dark:text-green-400",
                  state === "current" && "text-blue-600 dark:text-blue-400 font-semibold",
                  state === "pending" && "text-gray-400 dark:text-gray-500",
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}

      {showReturned && (
        <div className="flex items-start gap-3 relative">
          <div className="flex items-center gap-3 py-1.5">
            <div className="h-6 w-6 rounded-full grid place-items-center shrink-0 bg-green-500 text-white">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Returned
            </span>
          </div>
        </div>
      )}

      {showMaintenance && (
        <>
          <div className="flex items-start gap-3 relative">
            <div className="absolute left-[11px] top-6 w-0.5 h-8 bg-blue-500" />
            <div className="flex items-center gap-3 py-1.5">
              <div className="h-6 w-6 rounded-full grid place-items-center shrink-0 bg-blue-500 text-white ring-4 ring-blue-500/20">
                <Circle className="h-3 w-3" />
              </div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 font-semibold">
                Under Maintenance
              </span>
            </div>
          </div>
        </>
      )}

      {!showReturned && !showMaintenance && status !== "Delivered" && STATUS_ORDER[status] !== undefined && STATUS_ORDER[status] >= 0 && (
        <div className="mt-2 text-xs text-muted-foreground italic">
          Current step: {status}
        </div>
      )}
    </div>
  );
}
