import {
  CheckCircle,
  ClockPending,
  LockClosed,
  XCircle,
} from "@/components/ui/icons";

export type BadgeVariant =
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "NOT_STARTED"
  | "BENAR"
  | "SALAH"
  | "LOCKED";

export function PlasStatusBadge({
  variant,
  label,
}: {
  variant: BadgeVariant;
  label?: string;
}) {
  if (variant === "SUBMITTED" || variant === "BENAR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--plas-radius-sm)] border border-[var(--plas-success-border)] bg-[var(--plas-success-bg)] px-2.5 py-1 text-xs font-medium text-[var(--plas-success-text)]">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>{label ?? (variant === "BENAR" ? "Benar" : "SUBMITTED")}</span>
      </span>
    );
  }

  if (variant === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--plas-radius-sm)] border border-[var(--plas-warning-border)] bg-[var(--plas-warning-bg)] px-2.5 py-1 text-xs font-medium text-[var(--plas-warning-text)]">
        <ClockPending className="h-4 w-4 shrink-0" />
        <span>{label ?? "IN_PROGRESS"}</span>
      </span>
    );
  }

  if (variant === "SALAH") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--plas-radius-sm)] border border-[var(--plas-error-border)] bg-[var(--plas-error-bg)] px-2.5 py-1 text-xs font-medium text-[var(--plas-error-text)]">
        <XCircle className="h-4 w-4 shrink-0" />
        <span>{label ?? "Salah"}</span>
      </span>
    );
  }

  if (variant === "LOCKED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--plas-radius-sm)] border border-[var(--plas-disabled-border)] bg-[var(--plas-disabled-bg)] px-2.5 py-1 text-xs font-medium text-[var(--plas-disabled-text)]">
        <LockClosed className="h-4 w-4 shrink-0" />
        <span>{label ?? "Terkunci"}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--plas-radius-sm)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--plas-text-muted)]">
      <ClockPending className="h-4 w-4 shrink-0" />
      <span>{label ?? "Belum dikumpulkan"}</span>
    </span>
  );
}
