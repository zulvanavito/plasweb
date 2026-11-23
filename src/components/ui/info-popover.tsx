"use client";

import { useEffect, useId, useRef, useState } from "react";
import { InfoCircle } from "@/components/ui/icons";

export function InfoPopover({
  label,
  description,
  align = "left",
}: {
  label: string;
  description: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-h-[32px] min-w-[32px] cursor-pointer items-center justify-center rounded-[var(--plas-radius-full)] text-[var(--plas-text-muted)] transition-colors hover:bg-[var(--plas-brand-tint)] hover:text-[var(--plas-brand-primary)]"
      >
        <InfoCircle className="h-4 w-4" />
      </button>

      {open ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label={label}
          className={`fixed inset-x-4 bottom-4 z-40 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-3.5 text-left text-xs leading-relaxed text-[var(--plas-text-secondary)] shadow-[var(--plas-shadow-floating)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:w-72 ${
            align === "right" ? "sm:right-0" : "sm:left-0"
          }`}
        >
          <p className="font-semibold text-[var(--plas-text-primary)]">{label}</p>
          <p className="mt-1">{description}</p>
        </div>
      ) : null}
    </div>
  );
}
