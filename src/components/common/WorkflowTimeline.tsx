import { cn } from "@/lib/utils";
import { Check, Circle, ArrowDown, XCircle } from "lucide-react";

export interface WorkflowTimelineProps {
  allocationStatus?: string;
  verificationStatus?: string;
  currentWorkflowState?: string;
  variant?: "vertical" | "horizontal";
}

const STEPS = [
  { id: "admin", label: "Admin" },
  { id: "asset-manager", label: "Asset Manager" },
  { id: "it-support", label: "IT Support" },
  { id: "delivery", label: "Delivery" },
];

export function getActiveStageIndex(allocationStatus?: string): number {
  const normalized = normalizeWorkflowStatus(allocationStatus);
  if (!normalized || normalized === "awaiting asset verification") return 1;
  if (normalized === "out of stock") return 1;
  if (normalized === "waiting for procurement") return 1;
  if (normalized === "waiting for remaining hardware") return 1;
  if (["pending it support", "sent to it support", "sent to it support team", "ready for allocation", "ready for it support", "it support pending"].includes(normalized)) return 2;
  if (normalized === "assigned to it support" || normalized === "it asset assignment in progress") return 2;
  if (normalized === "asset allocated" || normalized === "assets allocated") return 3;
  if (normalized === "ready for delivery") return 3;
  if (normalized === "completed" || normalized === "it approval") return 4;
  return 1;
}

export function isPendingRemainingAssets(
  allocationStatus?: string,
  verificationStatus?: string,
  currentWorkflowState?: string,
): boolean {
  if (currentWorkflowState?.toUpperCase() === "PENDING_REMAINING_ASSETS") return true;
  const verification = normalizeWorkflowStatus(verificationStatus);
  const normalized = normalizeWorkflowStatus(allocationStatus);
  if (verification === "verified" && normalized === "awaiting asset verification") return true;
  return false;
}

export function getWorkflowStageLabel(
  allocationStatus?: string,
  verificationStatus?: string,
  currentWorkflowState?: string,
): string {
  if (isPendingRemainingAssets(allocationStatus, verificationStatus, currentWorkflowState)) {
    return "Waiting for Remaining Hardware";
  }
  const idx = getActiveStageIndex(allocationStatus);
  if (idx >= 4) return "Completed";
  return STEPS[idx]?.label ?? "Asset Manager";
}

export function normalizeWorkflowStatus(status?: string): string {
  return (status ?? "").replace(/_/g, " ").trim().toLowerCase();
}

export function getStatusDisplayLabel(
  allocationStatus?: string,
  context?: { verificationStatus?: string; inventoryVerified?: boolean; currentWorkflowState?: string; onboardingStatus?: string },
): string {
  const normalized = normalizeWorkflowStatus(allocationStatus);
  const verification = normalizeWorkflowStatus(context?.verificationStatus);
  const currentWorkflow = normalizeWorkflowStatus(context?.currentWorkflowState);
  const onboarding = normalizeWorkflowStatus(context?.onboardingStatus);

  // Use CurrentWorkflowState from API as the primary source when available
  if (context?.currentWorkflowState) {
    const cwf = context.currentWorkflowState;
    const cwfNorm = normalizeWorkflowStatus(cwf);
    if (cwfNorm === "waiting for procurement") return "Out of Stock";
    if (cwfNorm === "completed") return "Completed";
    if (cwfNorm === "waiting for remaining hardware") return "Waiting for Remaining Hardware";
    return cwf;
  }

  if (normalized === "it approval") return "Completed";
  if (normalized === "it rejection") return "Rejected";
  if (verification === "out of stock" || normalized === "out of stock") return "Out of Stock";

  if (verification === "verified" && normalized === "awaiting asset verification") {
    return "Waiting for Remaining Hardware";
  }

  if (normalized === "waiting for procurement") {
    if (verification === "verified" || verification === "completed") {
      return "Pending IT Support";
    }
    if (currentWorkflow.includes("it support") || onboarding.includes("it support")) {
      return "Pending IT Support";
    }
    return "Pending Asset Manager Review";
  }

  const labelMap: Record<string, string> = {
    "Awaiting Asset Verification": "Pending Asset Manager Review",
    "Ready for Allocation": "Pending IT Support",
    "Pending IT Support": "Pending IT Support",
    "Sent to IT Support": "Pending IT Support",
    "Sent to IT Support Team": "Pending IT Support",
    "Ready for IT Support": "Pending IT Support",
    "IT_SUPPORT_PENDING": "Pending IT Support",
    "Assigned to IT Support": "IT Asset Assignment In Progress",
    "Asset Allocated": "Assets Allocated",
  };
  if (!allocationStatus) return "Pending Asset Manager Review";
  return labelMap[allocationStatus] || allocationStatus;
}

function StageIcon({ state }: { state: "completed" | "current" | "pending" }) {
  if (state === "completed") {
    return <Check className="h-3.5 w-3.5 stroke-[2.5]" />;
  }
  if (state === "current") {
    return <Circle className="h-3.5 w-3.5 fill-current" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />;
}

export function WorkflowTimeline({ allocationStatus, verificationStatus, currentWorkflowState, variant = "vertical" }: WorkflowTimelineProps) {
  const activeIndex = getActiveStageIndex(allocationStatus);
  const normalized = normalizeWorkflowStatus(allocationStatus);
  const isRejected = normalized === "rejected" || normalized === "it rejection";
  const showRemainingHardware = isPendingRemainingAssets(allocationStatus, verificationStatus, currentWorkflowState);

  if (isRejected) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-destructive",
        variant === "horizontal" && "text-xs"
      )}>
        <XCircle className="h-4 w-4" />
        <span className={cn("font-medium", variant === "horizontal" ? "text-[11px]" : "text-xs")}>Rejected</span>
      </div>
    );
  }

  if (normalized === "out of stock") {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-destructive",
        variant === "horizontal" && "text-xs"
      )}>
        <XCircle className="h-4 w-4" />
        <span className={cn("font-medium", variant === "horizontal" ? "text-[11px]" : "text-xs")}>Out of Stock</span>
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className="flex items-center gap-0.5 flex-wrap">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex && activeIndex < 4;
          const isPending = index > activeIndex || (index === activeIndex && activeIndex >= 4);

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none transition-colors",
                  isCompleted && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  isCurrent && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  isPending && "bg-muted text-muted-foreground",
                )}
              >
                <StageIcon state={isCompleted ? "completed" : isCurrent ? "current" : "pending"} />
                <span>{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <ArrowDown className="h-2.5 w-2.5 mx-0.5 text-muted-foreground/40 rotate-[-90deg]" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      {STEPS.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isCurrent = index === activeIndex && activeIndex < 4;
        const isPending = index > activeIndex || (index === activeIndex && activeIndex >= 4);

        return (
          <div key={step.id} className={cn("flex gap-2", showRemainingHardware && isCurrent ? "items-start" : "items-center")}>
            <span
              className={cn(
                "h-5 w-5 rounded-full grid place-items-center shrink-0 transition-all",
                isCompleted && "bg-green-500 text-white",
                isCurrent && "bg-blue-500 text-white",
                isPending && "bg-muted text-muted-foreground/30",
              )}
            >
              <StageIcon state={isCompleted ? "completed" : isCurrent ? "current" : "pending"} />
            </span>
            <div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isCompleted && "text-green-600 dark:text-green-400",
                  isCurrent && "text-blue-600 dark:text-blue-400 font-semibold",
                  isPending && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {isCurrent && !showRemainingHardware && (
                <span className="text-[11px] text-blue-500 font-medium ml-1">(In Progress)</span>
              )}
              {isCurrent && showRemainingHardware && (
                <div className="text-[11px] text-blue-500 font-medium mt-0.5">Waiting for Remaining Hardware</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
