import type { LecturerMaterialDistributionDto } from "@/lib/dto/lecturer-mappers";

export function ExerciseStatusChart({
  submitted,
  inProgress,
}: {
  submitted: number;
  inProgress: number;
}) {
  const total = submitted + inProgress;
  const subPct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const progPct = total > 0 ? 100 - subPct : 0;

  return (
    <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
          Distribusi Status Latihan
        </h3>
        <span className="text-xs font-medium text-[var(--plas-text-muted)]">
          Total: {total} attempt
        </span>
      </div>

      {/* Stacked bar SVG dengan celah wajib minimal 4px #FFFFFF (DESIGN.md §3.1.E) */}
      <div className="my-4">
        <svg
          viewBox="0 0 400 32"
          className="h-8 w-full"
          role="img"
          aria-label={`Submitted ${submitted}, In Progress ${inProgress}`}
        >
          {total === 0 ? (
            <rect
              x="0"
              y="4"
              width="400"
              height="24"
              rx="6"
              fill="#E2E8F0"
            />
          ) : (
            <>
              {submitted > 0 ? (
                <rect
                  x="0"
                  y="4"
                  width={
                    inProgress > 0
                      ? Math.max(8, (submitted / total) * 394)
                      : 400
                  }
                  height="24"
                  rx="6"
                  fill="#15803D"
                />
              ) : null}
              {inProgress > 0 ? (
                <rect
                  x={
                    submitted > 0
                      ? Math.max(8, (submitted / total) * 394) + 6
                      : 0
                  }
                  y="4"
                  width={
                    submitted > 0
                      ? Math.max(8, (inProgress / total) * 394)
                      : 400
                  }
                  height="24"
                  rx="6"
                  fill="#B45309"
                />
              ) : null}
            </>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#15803D]" />
            <span className="text-sm font-medium text-[var(--plas-text-secondary)]">
              Submitted
            </span>
          </div>
          <span className="font-mono text-sm font-semibold text-[var(--plas-text-primary)]">
            {submitted} ({subPct}%)
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#B45309]" />
            <span className="text-sm font-medium text-[var(--plas-text-secondary)]">
              In Progress
            </span>
          </div>
          <span className="font-mono text-sm font-semibold text-[var(--plas-text-primary)]">
            {inProgress} ({progPct}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export function PrePostComparisonChart({
  avgPre,
  avgPost,
  pairedPre,
  pairedPost,
  pairedDelta,
  pairedCount,
}: {
  avgPre: number | null;
  avgPost: number | null;
  pairedPre: number | null;
  pairedPost: number | null;
  pairedDelta: number | null;
  pairedCount: number;
}) {
  const preVal = avgPre ?? 0;
  const postVal = avgPost ?? 0;

  return (
    <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
          Perbandingan Pre-Test vs Post-Test
        </h3>
        <span className="text-xs font-medium text-[var(--plas-text-muted)]">
          Hanya attempt SUBMITTED
        </span>
      </div>

      <div className="my-3">
        <svg
          viewBox="0 0 360 150"
          className="h-40 w-full"
          role="img"
          aria-label={`Rata-rata Pre-Test ${avgPre ?? "belum ada"}, Post-Test ${avgPost ?? "belum ada"}`}
        >
          {/* Garis referensi 0, 50, 100 */}
          <line x1="36" y1="20" x2="340" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
          <line x1="36" y1="70" x2="340" y2="70" stroke="#E2E8F0" strokeDasharray="3 3" />
          <line x1="36" y1="120" x2="340" y2="120" stroke="#CBD5E1" />
          <text x="28" y="24" textAnchor="end" fill="#475569" fontSize="10">100</text>
          <text x="28" y="74" textAnchor="end" fill="#475569" fontSize="10">50</text>
          <text x="28" y="124" textAnchor="end" fill="#475569" fontSize="10">0</text>

          {/* Batang Pre-Test (#64748B) & Post-Test (#1D4ED8) dipisah celah putih >= 4px */}
          <rect
            x="96"
            y={120 - preVal}
            width="64"
            height={Math.max(2, preVal)}
            rx="6"
            fill="#64748B"
          />
          <text x="128" y={Math.max(12, 114 - preVal)} textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="600">
            {avgPre !== null ? avgPre.toFixed(1) : "N/A"}
          </text>
          <text x="128" y="138" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">
            Pre-Test
          </text>

          <rect
            x="196"
            y={120 - postVal}
            width="64"
            height={Math.max(2, postVal)}
            rx="6"
            fill="#1D4ED8"
          />
          <text x="228" y={Math.max(12, 114 - postVal)} textAnchor="middle" fill="#1D4ED8" fontSize="11" fontWeight="700">
            {avgPost !== null ? avgPost.toFixed(1) : "N/A"}
          </text>
          <text x="228" y="138" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">
            Post-Test
          </text>
        </svg>
      </div>

      <div className="rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] px-3.5 py-2.5 text-xs text-[var(--plas-text-secondary)]">
        {pairedCount > 0 ? (
          <span>
            Pasangan lengkap ({pairedCount} mahasiswa): Pre{" "}
            <strong className="font-mono text-[var(--plas-text-primary)]">
              {pairedPre?.toFixed(2)}
            </strong>{" "}
            vs Post{" "}
            <strong className="font-mono text-[var(--plas-text-primary)]">
              {pairedPost?.toFixed(2)}
            </strong>{" "}
            (Selisih:{" "}
            <strong className="font-mono text-[var(--plas-brand-primary)]">
              {(pairedDelta ?? 0) >= 0 ? "+" : ""}
              {pairedDelta?.toFixed(2)}
            </strong>
            )
          </span>
        ) : (
          <span>
            Belum ada pasangan mahasiswa yang mengumpulkan Pre-Test dan Post-Test sekaligus.
          </span>
        )}
      </div>
    </div>
  );
}

export function ActivityTrendChart({
  data,
}: {
  data: Array<{ date: string; exercise_attempts: number; test_attempts: number }>;
}) {
  const recent = data.slice(-10);
  const maxTotal = Math.max(
    1,
    ...recent.map((d) => d.exercise_attempts + d.test_attempts)
  );

  return (
    <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
          Tren Aktivitas Pembelajaran (WITA)
        </h3>
        <span className="text-xs font-medium text-[var(--plas-text-muted)]">
          {recent.length} hari aktif
        </span>
      </div>

      {recent.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--plas-text-muted)]">
          Belum ada aktivitas pada rentang filter yang dipilih.
        </p>
      ) : (
        <div className="space-y-2.5">
          {recent.map((item) => {
            const exWidth = Math.round((item.exercise_attempts / maxTotal) * 100);
            const testWidth = Math.round((item.test_attempts / maxTotal) * 100);
            return (
              <div key={item.date} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-[var(--plas-text-secondary)]">
                    {item.date}
                  </span>
                  <span className="text-[var(--plas-text-muted)]">
                    Latihan: {item.exercise_attempts} | Tes: {item.test_attempts}
                  </span>
                </div>
                <div className="flex h-3 w-full items-center gap-1 overflow-hidden rounded-full bg-[var(--plas-bg-subtle)] p-0.5">
                  {item.exercise_attempts > 0 ? (
                    <div
                      className="h-full rounded-full bg-[var(--plas-brand-primary)]"
                      style={{ width: `${Math.max(4, exWidth)}%` }}
                    />
                  ) : null}
                  {item.test_attempts > 0 ? (
                    <div
                      className="h-full rounded-full bg-[#64748B]"
                      style={{ width: `${Math.max(4, testWidth)}%` }}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MaterialDistributionChart({
  items,
}: {
  items: LecturerMaterialDistributionDto[];
}) {
  const maxCount = Math.max(1, ...items.map((m) => m.attempt_count));

  return (
    <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
          Distribusi Latihan Berdasarkan Materi (Materi 01 s.d. 07)
        </h3>
        <span className="text-xs font-medium text-[var(--plas-text-muted)]">
          Submitted vs Total Attempt
        </span>
      </div>

      <div className="space-y-3">
        {items.map((m) => {
          const totalPct = Math.round((m.attempt_count / maxCount) * 100);
          const subPct =
            m.attempt_count > 0
              ? Math.round((m.submitted_count / m.attempt_count) * 100)
              : 0;
          return (
            <div key={m.material_id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-[var(--plas-text-primary)]">
                  <span className="mr-1.5 font-mono text-[var(--plas-brand-primary)]">
                    M{String(m.sequence).padStart(2, "0")}
                  </span>
                  {m.title}
                </span>
                <span className="shrink-0 font-mono text-[var(--plas-text-muted)]">
                  {m.submitted_count}/{m.attempt_count}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--plas-bg-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--plas-brand-primary)]/25"
                  style={{ width: `${m.attempt_count > 0 ? Math.max(3, totalPct) : 0}%` }}
                >
                  <div
                    className="h-full rounded-full bg-[var(--plas-brand-primary)]"
                    style={{ width: `${subPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
