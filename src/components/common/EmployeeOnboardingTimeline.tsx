import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";

export interface OnboardingTimelineData {
  allocationStatus?: string;
  allocationHistory?: { step: string; timestamp: string; actor: string; remarks?: string }[];
  verificationStatus?: string;
  joinDate?: string;
}

const LEGACY_STEP_MAP: Record<string, string> = {
  "Asset Assigned": "Assets Allocated",
  "Waiting for Inventory": "Out of Stock",
  "Awaiting Asset Verification": "Pending Asset Manager Review",
  "Ready for Allocation": "Sent to IT Support Team",
  "Assigned to IT Support": "IT Asset Assignment In Progress",
  "Asset Allocated": "Assets Allocated",
};

export const NORMAL_STEPS = [
  { id: "Admin Registration", label: "Admin Registration" },
  { id: "Pending Asset Manager Review", label: "Pending Asset Manager Review" },
  { id: "Inventory Verified", label: "Inventory Verified" },
  { id: "Sent to IT Support Team", label: "Sent to IT Support Team" },
  { id: "IT Asset Assignment In Progress", label: "IT Asset Assignment In Progress" },
  { id: "Assets Allocated", label: "Assets Allocated" },
  { id: "Ready for Delivery", label: "Ready for Delivery" },
  { id: "Completed", label: "Completed" },
];

const OUT_OF_STOCK_STEPS = [
  { id: "Employee Created", label: "Employee Created" },
  { id: "Awaiting Asset Verification", label: "Awaiting Asset Verification" },
  { id: "Out of Stock", label: "Out of Stock" },
  { id: "Waiting for Procurement", label: "Waiting for Procurement" },
];

const NORMAL_STEP_ORDER = NORMAL_STEPS.reduce<Record<string, number>>((acc, s, i) => {
  acc[s.id] = i;
  return acc;
}, {});

function mapHistoryStep(step: string): string {
  return LEGACY_STEP_MAP[step] || step;
}

export function getWorkflowState(data: OnboardingTimelineData): string {
  const isOutOfStock =
    data.verificationStatus === "Out of Stock" ||
    data.allocationStatus === "Out of Stock" ||
    data.allocationHistory?.some((h) => mapHistoryStep(h.step) === "Out of Stock");

  if (isOutOfStock) return "Out of Stock";

  const allocationStatus = data.allocationStatus;
  if (!allocationStatus || allocationStatus === "Awaiting Asset Verification") {
    return "Pending Asset Manager Review";
  }
  if (allocationStatus === "Sent to IT Support Team") {
    const history = data.allocationHistory || [];
    const mappedSteps = history.map((h) => mapHistoryStep(h.step));
    if (mappedSteps.includes("Ready for Delivery")) return "Ready for Delivery";
    if (mappedSteps.includes("Assets Allocated")) return "Assets Allocated";
    if (mappedSteps.includes("IT Asset Assignment In Progress")) return "IT Asset Assignment In Progress";
    return "Sent to IT Support Team";
  }
  if (allocationStatus === "Completed") return "Completed";
  return allocationStatus;
}

function getActiveStepId(data: OnboardingTimelineData): string | null {
  const isOutOfStock =
    data.verificationStatus === "Out of Stock" ||
    data.allocationStatus === "Out of Stock" ||
    data.allocationHistory?.some((h) => mapHistoryStep(h.step) === "Out of Stock");

  if (isOutOfStock) return "Out of Stock";

  const s = data.allocationStatus;
  if (!s || s === "Awaiting Asset Verification") return "Pending Asset Manager Review";
  if (s === "Sent to IT Support Team") {
    const history = data.allocationHistory || [];
    const mappedSteps = history.map((h) => mapHistoryStep(h.step));
    if (mappedSteps.includes("Completed")) return null;
    if (mappedSteps.includes("Ready for Delivery")) return "Completed";
    if (mappedSteps.includes("Assets Allocated")) return "Ready for Delivery";
    if (mappedSteps.includes("IT Asset Assignment In Progress")) return "Assets Allocated";
    return "IT Asset Assignment In Progress";
  }
  if (s === "Completed") return null;
  return null;
}

function getLogicallyCompletedSteps(data: OnboardingTimelineData): Set<string> {
  const completed = new Set<string>();
  completed.add("Admin Registration");

  const isOutOfStock =
    data.verificationStatus === "Out of Stock" ||
    data.allocationStatus === "Out of Stock" ||
    data.allocationHistory?.some((h) => mapHistoryStep(h.step) === "Out of Stock");

  if (isOutOfStock) {
    if (data.allocationStatus === "Waiting for Inventory" || data.verificationStatus === "Out of Stock") {
      completed.add("Pending Asset Manager Review");
    }
    return completed;
  }

  const s = data.allocationStatus;
  if (s === "Sent to IT Support Team" || s === "Assigned to IT Support" || s === "Asset Allocated" || s === "Completed") {
    completed.add("Pending Asset Manager Review");
    completed.add("Inventory Verified");
    completed.add("Sent to IT Support Team");
  }
  if (s === "Assigned to IT Support" || s === "Asset Allocated" || s === "Completed") {
    completed.add("IT Asset Assignment In Progress");
  }
  if (s === "Asset Allocated" || s === "Completed") {
    completed.add("Assets Allocated");
  }
  if (s === "Completed") {
    completed.add("Ready for Delivery");
    completed.add("Completed");
  }
  return completed;
}

export function EmployeeOnboardingTimeline({ data }: { data: OnboardingTimelineData }) {
  const isOutOfStock =
    data.verificationStatus === "Out of Stock" ||
    data.allocationStatus === "Out of Stock" ||
    data.allocationHistory?.some((h) => mapHistoryStep(h.step) === "Out of Stock");

  const steps = isOutOfStock ? OUT_OF_STOCK_STEPS : NORMAL_STEPS;

  const history = data.allocationHistory && data.allocationHistory.length > 0
    ? data.allocationHistory
    : [{ step: "Admin Registration", timestamp: data.joinDate || new Date().toLocaleString(), actor: "System" }];

  const mappedHistory = history.map((h) => ({
    ...h,
    step: mapHistoryStep(h.step),
  }));

  const completedFromHistory = new Set(mappedHistory.map((h) => h.step));
  const completedFromLogic = getLogicallyCompletedSteps(data);
  const isCompleted = (stepId: string) => completedFromHistory.has(stepId) || completedFromLogic.has(stepId);

  const currentStepId = getActiveStepId(data);

  return (
    <div className="relative border-l pl-6 space-y-5 ml-3 mt-4">
      {steps.map((step) => {
        const done = isCompleted(step.id);
        const isCurrent = step.id === currentStepId;
        const isOutOfStockStep = step.id === "Out of Stock";
        const isFuture = !done && !isCurrent;

        const historyEntry = mappedHistory.find((h) => h.step === step.id);

        return (
          <div key={step.id} className="relative">
            <span
              className={cn(
                "absolute -left-[33px] top-0.5 h-4.5 w-4.5 rounded-full border-2 border-background grid place-items-center text-[9px] font-bold shadow-sm transition-all",
                done && "bg-success text-success-foreground border-success",
                isCurrent && !isOutOfStockStep && "bg-primary text-primary-foreground border-primary animate-pulse",
                isCurrent && isOutOfStockStep && "bg-destructive text-destructive-foreground border-destructive",
                isFuture && "bg-muted text-muted-foreground border-muted"
              )}
            >
              {done ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : isCurrent && isOutOfStockStep ? (
                <AlertTriangle className="h-3 w-3" />
              ) : isCurrent ? (
                <Circle className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </span>
            <div>
              <div
                className={cn(
                  "text-xs font-semibold",
                  done && "text-foreground",
                  isCurrent && !isOutOfStockStep && "text-primary",
                  isCurrent && isOutOfStockStep && "text-destructive",
                  isFuture && "text-muted-foreground"
                )}
              >
                {step.label}
              </div>
              {historyEntry ? (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {historyEntry.remarks && <div>{historyEntry.remarks}</div>}
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {historyEntry.timestamp} • by {historyEntry.actor}
                  </div>
                </div>
              ) : isCurrent && isOutOfStockStep ? (
                <div className="text-xs text-destructive/85 italic mt-0.5">
                  Stock unavailable. Procurement needed.
                </div>
              ) : isCurrent ? (
                <div className="text-xs text-primary/85 italic mt-0.5">
                  Awaiting verification/allocation action…
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/40 mt-0.5">Pending previous steps</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
