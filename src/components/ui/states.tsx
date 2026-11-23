"use client";

import { useEffect, type ReactNode } from "react";
import { AlertTriangle, XClose } from "@/components/ui/icons";

export function SkeletonBlock({ className = "h-24 w-full" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-subtle)] ${className}`}
    />
  );
}

export function ErrorBanner({
  title = "Gagal Memuat Data",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-[var(--plas-radius-lg)] border border-[var(--plas-error-border)] bg-[var(--plas-error-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--plas-error-text)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--plas-error-text)]">
            {title}
          </p>
          <p className="mt-0.5 text-sm text-[var(--plas-error-text)]">
            {message}
          </p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--plas-radius-md)] border border-[var(--plas-error-border)] bg-white px-4 text-sm font-semibold text-[var(--plas-error-text)] transition-colors hover:bg-[var(--plas-error-bg)]"
        >
          Coba Lagi
        </button>
      ) : null}
    </div>
  );
}

export function ReadOnlyModal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--plas-radius-xl)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] shadow-[var(--plas-shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--plas-border-subtle)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--plas-text-primary)]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs font-medium text-[var(--plas-text-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white text-[var(--plas-text-primary)] transition-colors hover:bg-[var(--plas-bg-subtle)]"
          >
            <XClose className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
