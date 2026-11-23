"use client";

import { InfoPopover } from "@/components/ui/info-popover";
import { EmptyState } from "@/components/ui/owl-mascot";
import type {
  LecturerAiUsageSummaryDto,
  LecturerMaterialDistributionDto,
  LecturerMaterialPerformanceDto,
  LecturerPostTestReadinessDto,
} from "@/lib/dto/lecturer-mappers";

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
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
            Perbandingan Pre-Test vs Post-Test
          </h3>
          <InfoPopover
            label="Info Perbandingan Pre-Test vs Post-Test"
            description="Rata-rata dihitung hanya dari tes yang telah diselesaikan. Selisih berpasangan (Post - Pre) hanya menghitung mahasiswa yang sudah menyelesaikan Pre-Test dan Post-Test sekaligus (pasangan lengkap)."
          />
        </div>
        <span className="text-xs font-medium text-[var(--plas-text-muted)]">
          Hanya tes selesai
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

export function MaterialPerformanceChart({
  items,
}: {
  items: LecturerMaterialPerformanceDto[];
}) {
  const scoredItems = items.filter(
    (item): item is LecturerMaterialPerformanceDto & { avg_score: number } =>
      item.avg_score !== null
  );

  let hardestMaterial: (LecturerMaterialPerformanceDto & { avg_score: number }) | null =
    null;
  for (const item of scoredItems) {
    if (
      hardestMaterial === null ||
      item.avg_score < hardestMaterial.avg_score ||
      (item.avg_score === hardestMaterial.avg_score &&
        item.sequence < hardestMaterial.sequence)
    ) {
      hardestMaterial = item;
    }
  }

  return (
    <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
              Rata-rata Skor per Materi (Materi 01 s.d. 07)
            </h3>
            <InfoPopover
              label="Info Rata-rata Skor per Materi"
              description="Materi yang belum memiliki kiriman latihan selesai tampil sebagai Belum ada dan tidak dihitung sebagai 0. Topik tersulit menyorot materi dengan rata-rata skor terendah di antara materi yang sudah dikerjakan."
            />
          </div>
          <p className="text-xs text-[var(--plas-text-muted)]">
            Hanya dari latihan selesai; materi tanpa kiriman tampil Belum ada (tidak dihitung 0)
          </p>
        </div>
        {hardestMaterial ? (
          <span className="rounded-[var(--plas-radius-full)] border border-[var(--plas-warning-border)] bg-[var(--plas-warning-bg)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[var(--plas-warning-text)]">
            Topik tersulit: M{String(hardestMaterial.sequence).padStart(2, "0")} (
            {hardestMaterial.avg_score.toFixed(1)})
          </span>
        ) : (
          <span className="text-xs font-medium text-[var(--plas-text-muted)]">
            Belum ada skor
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Data materi belum tersedia"
          description="Rata-rata skor per materi akan tampil setelah mahasiswa mengumpulkan latihan."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isHardest =
              hardestMaterial !== null &&
              item.material_id === hardestMaterial.material_id;
            const barWidth =
              item.avg_score !== null
                ? Math.max(8, Math.min(240, (item.avg_score / 100) * 240))
                : 0;
            const fillColor = isHardest ? "#B45309" : "#1D4ED8";

            return (
              <div
                key={item.material_id}
                className={`space-y-1.5 rounded-[var(--plas-radius-md)] border px-3 py-2 ${
                  isHardest
                    ? "border-[var(--plas-warning-border)] bg-[var(--plas-warning-bg)]/50"
                    : "border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-[var(--plas-text-primary)]">
                    <span
                      className={`mr-1.5 font-mono ${
                        isHardest
                          ? "text-[var(--plas-warning-text)]"
                          : "text-[var(--plas-brand-primary)]"
                      }`}
                    >
                      M{String(item.sequence).padStart(2, "0")}
                    </span>
                    {item.title}
                  </span>
                  <span className="shrink-0 font-mono font-semibold text-[var(--plas-text-primary)]">
                    {item.avg_score !== null ? item.avg_score.toFixed(1) : "Belum ada"}{" "}
                    <span className="font-normal text-[var(--plas-text-muted)]">
                      ({item.submitted_attempts_count}x)
                    </span>
                  </span>
                </div>

                <svg
                  viewBox="0 0 240 8"
                  className="h-2 w-full"
                  role="img"
                  aria-label={`Materi ${item.sequence} ${item.title}: ${
                    item.avg_score !== null
                      ? `rata-rata ${item.avg_score.toFixed(1)}`
                      : "belum ada attempt submitted"
                  }`}
                >
                  <rect x="0" y="0" width="240" height="8" rx="4" fill="#E2E8F0" />
                  {item.avg_score !== null ? (
                    <rect
                      x="0"
                      y="0"
                      width={barWidth}
                      height="8"
                      rx="4"
                      fill={fillColor}
                    />
                  ) : null}
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AiUsageSummaryPanel({
  summary,
}: {
  summary: LecturerAiUsageSummaryDto;
}) {
  const recentDays = summary.daily_trend.slice(-7);
  const maxDayCount = Math.max(
    1,
    ...recentDays.map((day) => day.success_requests)
  );
  const avgPerStudent =
    summary.active_students_count > 0
      ? (summary.total_success_requests / summary.active_students_count).toFixed(1)
      : "0.0";

  return (
    <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
              Penggunaan AI Socratic
            </h3>
            <InfoPopover
              label="Info Penggunaan AI Socratic"
              description="Statistik bersifat agregat anonim tanpa menampilkan isi prompt maupun percakapan siswa. Kuota harian mahasiswa (10 permintaan per hari) direset otomatis setiap pukul 00:00 WITA."
              align="right"
            />
          </div>
          <p className="text-xs text-[var(--plas-text-muted)]">
            Ringkasan anonim mahasiswa di kelas Anda pada periode filter
          </p>
        </div>
        <span className="rounded-[var(--plas-radius-full)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-subtle)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[var(--plas-text-secondary)]">
          Permintaan berhasil (WITA)
        </span>
      </div>

      {summary.total_success_requests === 0 ? (
        <EmptyState
          title="Belum ada penggunaan AI Socratic"
          description="Statistik permintaan bantuan AI Socratic yang berhasil dari mahasiswa di kelas Anda akan dirangkum secara anonim di sini."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] p-3.5">
              <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                Total Permintaan Sukses
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-brand-primary)]">
                {summary.total_success_requests}
              </p>
              <p className="mt-1 text-[11px] text-[var(--plas-text-muted)]">
                Kuota reset 00:00 WITA
              </p>
            </div>
            <div className="rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] p-3.5">
              <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                Mahasiswa Aktif AI
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-text-primary)]">
                {summary.active_students_count}
              </p>
              <p className="mt-1 text-[11px] text-[var(--plas-text-muted)]">
                Rata-rata {avgPerStudent} permintaan / mahasiswa
              </p>
            </div>
          </div>

          {recentDays.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--plas-text-secondary)]">
                Tren Harian Permintaan AI ({recentDays.length} hari terakhir)
              </p>
              {recentDays.map((day) => {
                const widthPct = Math.round((day.success_requests / maxDayCount) * 100);
                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[var(--plas-text-secondary)]">
                        {day.date}
                      </span>
                      <span className="font-mono font-semibold text-[var(--plas-text-primary)]">
                        {day.success_requests}x
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--plas-bg-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--plas-brand-primary)]"
                        style={{ width: `${Math.max(4, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <p className="rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] px-3 py-2 text-[11px] text-[var(--plas-text-muted)]">
            Privasi terjaga: hanya jumlah permintaan sukses yang ditampilkan tanpa riwayat prompt atau percakapan siswa.
          </p>
        </div>
      )}
    </div>
  );
}

export function PostTestReadinessChart({
  readiness,
}: {
  readiness: LecturerPostTestReadinessDto;
}) {
  const {
    total_required_exercises: required,
    total_students: total,
    ready_count: ready,
    in_progress_count: inProgress,
    not_started_count: notStarted,
  } = readiness;

  const readyPct = total > 0 ? Math.round((ready / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const notStartedPct = total > 0 ? Math.max(0, 100 - readyPct - inProgressPct) : 0;

  const segments = [
    { key: "ready", count: ready, color: "#15803D" },
    { key: "in_progress", count: inProgress, color: "#B45309" },
    { key: "not_started", count: notStarted, color: "#64748B" },
  ].filter((seg) => seg.count > 0);

  const gapWidth = 6;
  const usableWidth = Math.max(0, 400 - Math.max(0, segments.length - 1) * gapWidth);
  let cursorX = 0;
  const barSegments = segments.map((seg, idx) => {
    const rawW = total > 0 ? (seg.count / total) * usableWidth : 0;
    const width =
      idx === segments.length - 1
        ? Math.max(8, 400 - cursorX)
        : Math.max(8, rawW);
    const x = cursorX;
    cursorX += width + gapWidth;
    return { ...seg, x, width };
  });

  const inProgressRangeLabel =
    required > 1 ? `1 s.d. ${required - 1} dari ${required} latihan` : "0 latihan";

  return (
    <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5 lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
              Progres Kesiapan Post-Test
            </h3>
            <InfoPopover
              label="Info Progres Kesiapan Post-Test"
              description="Syarat penyelesaian seluruh 20 latihan untuk membuka Post-Test dihitung secara kumulatif dari seluruh riwayat latihan selesai mahasiswa di kelas Anda, sehingga tidak terpengaruh filter rentang tanggal."
            />
          </div>
          <p className="text-xs text-[var(--plas-text-muted)]">
            Mahasiswa wajib menyelesaikan seluruh latihan yang tersedia agar Post-Test terbuka
          </p>
        </div>
        <span className="rounded-[var(--plas-radius-full)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-subtle)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[var(--plas-text-secondary)]">
          Syarat {required} latihan selesai ({total} mahasiswa)
        </span>
      </div>

      {total === 0 ? (
        <EmptyState
          title="Belum ada mahasiswa aktif di kelas"
          description="Progres kesiapan Post-Test akan tampil setelah mahasiswa bergabung ke kelas Anda."
        />
      ) : (
        <>
          <div className="my-4">
            <svg
              viewBox="0 0 400 32"
              className="h-8 w-full"
              role="img"
              aria-label={`Siap Post-Test ${ready}, Sedang Berjalan ${inProgress}, Belum Mulai ${notStarted}`}
            >
              {barSegments.map((seg) => (
                <rect
                  key={seg.key}
                  x={seg.x}
                  y="4"
                  width={seg.width}
                  height="24"
                  rx="6"
                  fill={seg.color}
                />
              ))}
            </svg>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm bg-[#15803D]" />
                <span className="text-xs font-semibold text-[var(--plas-text-secondary)] sm:text-sm">
                  Siap Post-Test ({required} dari {required} latihan)
                </span>
              </div>
              <span className="font-mono text-sm font-semibold text-[var(--plas-text-primary)]">
                {ready} ({readyPct}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm bg-[#B45309]" />
                <span className="text-xs font-semibold text-[var(--plas-text-secondary)] sm:text-sm">
                  Sedang Berjalan ({inProgressRangeLabel})
                </span>
              </div>
              <span className="font-mono text-sm font-semibold text-[var(--plas-text-primary)]">
                {inProgress} ({inProgressPct}%)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm bg-[#64748B]" />
                <span className="text-xs font-semibold text-[var(--plas-text-secondary)] sm:text-sm">
                  Belum Mulai (0 dari {required} latihan)
                </span>
              </div>
              <span className="font-mono text-sm font-semibold text-[var(--plas-text-primary)]">
                {notStarted} ({notStartedPct}%)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
