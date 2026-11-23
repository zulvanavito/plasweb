"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityTrendChart,
  AiUsageSummaryPanel,
  ExerciseStatusChart,
  MaterialPerformanceChart,
  PostTestReadinessChart,
  PrePostComparisonChart,
} from "@/components/charts/lecturer-charts";
import { ActivityDetailModal } from "@/components/lecturer/activity-detail-modal";
import { EvaluationDetailModal } from "@/components/lecturer/evaluation-detail-modal";
import {
  ActivityPulse,
  ChevronRight,
  CodeBrackets,
  RefreshCw,
  UsersGroup,
} from "@/components/ui/icons";
import { InfoPopover } from "@/components/ui/info-popover";
import { EmptyState } from "@/components/ui/owl-mascot";
import { PlasStatusBadge } from "@/components/ui/plas-status-badge";
import { ErrorBanner, SkeletonBlock } from "@/components/ui/states";
import {
  formatWitaDateTime,
  lecturerFetch,
  LecturerClientError,
} from "@/lib/api/lecturer-client";
import type { LecturerDashboardDto } from "@/lib/dto/lecturer-mappers";

export default function DashboardPage() {
  const [kelasId, setKelasId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<LecturerDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [selectedMahasiswaId, setSelectedMahasiswaId] = useState<string | null>(
    null
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (kelasId) params.set("kelas_id", kelasId);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    try {
      const res = await lecturerFetch<LecturerDashboardDto>(
        `/api/lecturer/dashboard${qs ? `?${qs}` : ""}`
      );
      setData(res);
    } catch (err) {
      setError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal memuat ringkasan dashboard dosen."
      );
    } finally {
      setLoading(false);
    }
  }, [kelasId, fromDate, toDate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const kpiCards = data
    ? [
        {
          label: "Mahasiswa Aktif Kelas",
          value: data.kpi.total_students,
          icon: UsersGroup,
          note: "Tidak termasuk pengguna umum",
          info: "Hanya menghitung mahasiswa yang terdaftar di kelas Anda. Pengguna Umum (mahasiswa tanpa kelas atau yang dikeluarkan dari kelas) tidak masuk hitungan analitik dashboard.",
        },
        {
          label: "Kelas Diampu",
          value: data.kpi.total_classes,
          icon: CodeBrackets,
          note: "Kelola di menu Data Kelas",
        },
        {
          label: "Total Latihan (Exercise)",
          value: data.kpi.total_exercise_attempts,
          icon: ActivityPulse,
          note: "Percobaan tersimpan",
        },
        {
          label: "Total Evaluasi (Pre/Post)",
          value: data.kpi.total_test_attempts,
          icon: ActivityPulse,
          note: `${data.test_comparison.paired_count} pasangan lengkap`,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
            CS LAB ENV // MONITORING DOSEN
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--plas-text-primary)]">
            Dashboard Analitik Pembelajaran
          </h1>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <div>
            <label
              htmlFor="dash-kelas"
              className="mb-1 block text-xs font-semibold text-[var(--plas-text-muted)]"
            >
              Kelas
            </label>
            <select
              id="dash-kelas"
              value={kelasId}
              onChange={(e) => setKelasId(e.target.value)}
              className="h-11 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            >
              <option value="">Semua Kelas</option>
              {(data?.classes ?? []).map((cls) => (
                <option key={cls.kelas_id} value={cls.kelas_id}>
                  {cls.kode} ({cls.nama})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dash-from"
              className="mb-1 block text-xs font-semibold text-[var(--plas-text-muted)]"
            >
              Dari (WITA)
            </label>
            <input
              id="dash-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-11 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="dash-to"
              className="mb-1 block text-xs font-semibold text-[var(--plas-text-muted)]"
            >
              Sampai (WITA)
            </label>
            <input
              id="dash-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-11 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--plas-brand-hover)]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={() => void loadDashboard()} />
      ) : null}

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonBlock className="h-64" />
            <SkeletonBlock className="h-64" />
          </div>
        </div>
      ) : data ? (
        <>
          {/* 4 Kartu KPI */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                          {card.label}
                        </p>
                        {"info" in card && card.info ? (
                          <InfoPopover
                            label={`Info ${card.label}`}
                            description={card.info}
                          />
                        ) : null}
                      </div>
                      <p className="mt-2 font-mono text-2xl font-bold text-[var(--plas-text-primary)]">
                        {card.value}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-[var(--plas-text-muted)]">
                    {card.note}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Grid Analitik 2 Kolom */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ExerciseStatusChart
              submitted={data.exercise_status_distribution.submitted}
              inProgress={data.exercise_status_distribution.in_progress}
            />
            <PrePostComparisonChart
              avgPre={data.test_comparison.avg_pre_score}
              avgPost={data.test_comparison.avg_post_score}
              pairedPre={data.test_comparison.paired_avg_pre_score}
              pairedPost={data.test_comparison.paired_avg_post_score}
              pairedDelta={data.test_comparison.paired_avg_delta}
              pairedCount={data.test_comparison.paired_count}
            />
            <MaterialPerformanceChart items={data.material_performance} />
            <AiUsageSummaryPanel summary={data.ai_usage_summary} />
            <PostTestReadinessChart readiness={data.post_test_readiness} />
            <ActivityTrendChart data={data.activity_trend} />

            {/* Aktivitas Pembelajaran Terbaru */}
            <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
                  Aktivitas Pembelajaran Terbaru
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[var(--plas-text-muted)]">
                    Zona WITA
                  </span>
                  <Link
                    href="/activities"
                    className="text-xs font-semibold text-[var(--plas-brand-primary)] hover:underline"
                  >
                    Lihat Semua
                  </Link>
                </div>
              </div>

              {data.recent_activities.length === 0 ? (
                <EmptyState
                  title="Belum ada aktivitas terbaru"
                  description="Aktivitas latihan dan tes mahasiswa dari kelas Anda akan muncul di sini."
                />
              ) : (
                <div className="divide-y divide-[var(--plas-border-subtle)]">
                  {data.recent_activities.map((act) => (
                    <button
                      key={`${act.kind}-${act.id}`}
                      type="button"
                      onClick={() => {
                        if (act.kind === "EXERCISE") {
                          setSelectedAttemptId(act.id);
                        } else {
                          setSelectedMahasiswaId(act.mahasiswa_id);
                        }
                      }}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--plas-radius-md)] px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--plas-bg-canvas)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--plas-text-primary)]">
                          {act.student_name}{" "}
                          <span className="font-mono text-xs font-normal text-[var(--plas-text-muted)]">
                            ({act.student_nim})
                          </span>
                        </p>
                        <p className="truncate text-xs text-[var(--plas-text-secondary)]">
                          {act.kelas_kode} | {act.title}
                        </p>
                        <p className="text-[11px] text-[var(--plas-text-muted)]">
                          {formatWitaDateTime(act.timestamp)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <PlasStatusBadge
                          variant={
                            act.status === "SUBMITTED"
                              ? "SUBMITTED"
                              : "IN_PROGRESS"
                          }
                        />
                        <span className="font-mono text-xs font-semibold text-[var(--plas-text-primary)]">
                          {act.score !== null ? act.score.toFixed(1) : "N/A"}
                        </span>
                        <ChevronRight className="h-4 w-4 text-[var(--plas-text-muted)]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}

      <ActivityDetailModal
        attemptId={selectedAttemptId}
        onClose={() => setSelectedAttemptId(null)}
      />
      <EvaluationDetailModal
        mahasiswaId={selectedMahasiswaId}
        onClose={() => setSelectedMahasiswaId(null)}
      />
    </div>
  );
}
