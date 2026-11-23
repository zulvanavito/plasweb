import type { ReactNode } from "react";

export function OwlBracketMascot({
  size = 56,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Badan & telinga burung hantu geometris Academic Slate */}
      <path
        d="M16 14L23 20H41L48 14L50 28C52 38 45 54 32 54C19 54 12 38 14 28L16 14Z"
        fill="#0F172A"
      />
      {/* Aksen sayap Academic Cobalt */}
      <path d="M14 31C11 38 14 47 20 50L22 36L14 31Z" fill="#1D4ED8" />
      <path d="M50 31C53 38 50 47 44 50L42 36L50 31Z" fill="#1D4ED8" />
      {/* Dada lembut */}
      <ellipse cx="32" cy="43" rx="10" ry="8" fill="#EFF6FF" />
      {/* Lensa kacamata kiri & kanan */}
      <circle cx="24" cy="30" r="7.5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.2" />
      <circle cx="40" cy="30" r="7.5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="2.2" />
      {/* Jembatan kacamata */}
      <line x1="31.5" y1="30" x2="32.5" y2="30" stroke="#1D4ED8" strokeWidth="2.2" />
      {/* Simbol kurung kurawal { } di dalam lensa */}
      <text
        x="24"
        y="33.5"
        textAnchor="middle"
        fill="#0F172A"
        fontFamily="monospace"
        fontSize="11"
        fontWeight="700"
      >
        {"{"}
      </text>
      <text
        x="40"
        y="33.5"
        textAnchor="middle"
        fill="#0F172A"
        fontFamily="monospace"
        fontSize="11"
        fontWeight="700"
      >
        {"}"}
      </text>
      {/* Paruh geometris */}
      <path d="M32 33L29.5 37H34.5L32 33Z" fill="#FCD34D" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] px-6 py-10 text-center">
      <OwlBracketMascot size={56} className="mb-3" />
      <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-sm text-[var(--plas-text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
