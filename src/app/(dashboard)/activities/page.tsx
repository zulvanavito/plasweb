"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialDistributionChart } from "@/components/charts/lecturer-charts";
import { ActivityDetailModal } from "@/components/lecturer/activity-detail-modal";
import { EvaluationDetailModal } from "@/components/lecturer/evaluation-detail-modal";
import { DownloadTray, SearchMagnifier } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/owl-mascot";
import { PlasStatusBadge } from "@/components/ui/plas-status-badge";
import { ErrorBanner, SkeletonBlock } from "@/components/ui/states";
import {
  downloadLecturerCsv,
  formatWitaDateTime,
  lecturerFetch,
  LecturerClientError,
} from "@/lib/api/lecturer-client";
import type {
  LecturerActivitiesResponseDto,
  LecturerEvaluationsResponseDto,
} from "@/lib/dto/lecturer-mappers";

type ActivitiesSubTab = "EXERCISES" | "EVALUATIONS";

export default function ActivitiesPage() {
  const [subTab, setSubTab] = useState<ActivitiesSubTab>("EXERCISES");

  // State Sub-Tab 1: Riwayat Latihan
  const [exKelasId, setExKelasId] = useState("");
  const [exMaterialId, setExMaterialId] = useState("");
  const [exQuestionType, setExQuestionType] = useState("");
  const [exStatus, setExStatus] = useState("");
  const [exSearch, setExSearch] = useState("");
  const [exData, setExData] = useState<LecturerActivitiesResponseDto | null>(
    null
  );
  const [exLoading, setExLoading] = useState(true);
  const [exError, setExError] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
    null
  );

  // State Sub-Tab 2: Evaluasi Pre/Post & Selisih
  const [evKelasId, setEvKelasId] = useState("");
  const [evSearch, setEvSearch] = useState("");
  const [evData, setEvData] = useState<LecturerEvaluationsResponseDto | null>(
    null
  );
  const [evLoading, setEvLoading] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [selectedMahasiswaId, setSelectedMahasiswaId] = useState<string | null>(
    null
  );

  const loadActivities = useCallback(async () => {
    setExLoading(true);
    setExError(null);
    const params = new URLSearchParams();
    if (exKelasId) params.set("kelas_id", exKelasId);
    if (exMaterialId) params.set("material_id", exMaterialId);
    if (exQuestionType) params.set("question_type", exQuestionType);
    if (exStatus) params.set("status", exStatus);
    if (exSearch.trim()) params.set("search", exSearch.trim());
    const qs = params.toString();

    try {
      const res = await lecturerFetch<LecturerActivitiesResponseDto>(
        `/api/lecturer/activities${qs ? `?${qs}` : ""}`
      );
      setExData(res);
    } catch (err) {
      setExError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal memuat riwayat aktivitas latihan."
      );
    } finally {
      setExLoading(false);
    }
  }, [exKelasId, exMaterialId, exQuestionType, exStatus, exSearch]);

  const loadEvaluations = useCallback(async () => {
    setEvLoading(true);
    setEvError(null);
    const params = new URLSearchParams();
    if (evKelasId) params.set("kelas_id", evKelasId);
    if (evSearch.trim()) params.set("search", evSearch.trim());
    const qs = params.toString();

    try {
      const res = await lecturerFetch<LecturerEvaluationsResponseDto>(
        `/api/lecturer/evaluations${qs ? `?${qs}` : ""}`
      );
      setEvData(res);
    } catch (err) {
      setEvError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal memuat rekap evaluasi mahasiswa."
      );
    } finally {
      setEvLoading(false);
    }
  }, [evKelasId, evSearch]);

  useEffect(() => {
    if (subTab === "EXERCISES") {
      void loadActivities();
    }
  }, [subTab, loadActivities]);

  useEffect(() => {
    if (subTab === "EVALUATIONS") {
      void loadEvaluations();
    }
  }, [subTab, loadEvaluations]);

  async function handleExportEvaluationsCsv() {
    if (!evKelasId) return;
    setExportingCsv(true);
    setEvError(null);
    try {
      await downloadLecturerCsv(evKelasId);
    } catch (err) {
      setEvError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal mengunduh CSV evaluasi."
      );
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
          READ-ONLY // PEMANTAUAN MAHASISWA
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--plas-text-primary)]">
          Aktivitas Pembelajaran
        </h1>
      </div>

      {/* 2 Sub-Tab Eksplisit (DESIGN.md §5.3 W04) */}
      <div
        role="tablist"
        aria-label="Sub-tab aktivitas pembelajaran"
        className="flex flex-wrap gap-2 border-b border-[var(--plas-border-divider)] pb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "EXERCISES"}
          onClick={() => setSubTab("EXERCISES")}
          className={`min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] px-4 text-sm font-semibold transition-colors ${
            subTab === "EXERCISES"
              ? "bg-[var(--plas-brand-primary)] text-white"
              : "border border-[var(--plas-border-divider)] bg-white text-[var(--plas-text-secondary)] hover:bg-[var(--plas-bg-subtle)]"
          }`}
        >
          Riwayat Latihan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "EVALUATIONS"}
          onClick={() => setSubTab("EVALUATIONS")}
          className={`min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] px-4 text-sm font-semibold transition-colors ${
            subTab === "EVALUATIONS"
              ? "bg-[var(--plas-brand-primary)] text-white"
              : "border border-[var(--plas-border-divider)] bg-white text-[var(--plas-text-secondary)] hover:bg-[var(--plas-bg-subtle)]"
          }`}
        >
          Evaluasi Pre/Post &amp; Selisih
        </button>
      </div>

      {subTab === "EXERCISES" ? (
        <section className="space-y-5">
          {exError ? (
            <ErrorBanner
              message={exError}
              onRetry={() => void loadActivities()}
            />
          ) : null}

          {exData ? (
            <MaterialDistributionChart items={exData.material_distribution} />
          ) : exLoading ? (
            <SkeletonBlock className="h-56" />
          ) : null}

          {/* Filter Riwayat Latihan */}
          <div className="grid grid-cols-1 gap-3 rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <SearchMagnifier className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--plas-text-muted)]" />
              <input
                type="search"
                value={exSearch}
                onChange={(e) => setExSearch(e.target.value)}
                placeholder="Cari nama atau NIM mahasiswa..."
                aria-label="Cari aktivitas latihan mahasiswa"
                className="h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white pl-10 pr-3 text-sm text-[var(--plas-text-primary)]"
              />
            </div>

            <select
              value={exKelasId}
              onChange={(e) => setExKelasId(e.target.value)}
              aria-label="Filter kelas latihan"
              className="h-11 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            >
              <option value="">Semua Kelas</option>
              {(exData?.classes ?? []).map((cls) => (
                <option key={cls.kelas_id} value={cls.kelas_id}>
                  {cls.kode}
                </option>
              ))}
            </select>

            <select
              value={exMaterialId}
              onChange={(e) => setExMaterialId(e.target.value)}
              aria-label="Filter materi latihan"
              className="h-11 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            >
              <option value="">Semua Materi</option>
              {(exData?.materials ?? []).map((mat) => (
                <option key={mat.material_id} value={mat.material_id}>
                  M{String(mat.sequence).padStart(2, "0")}: {mat.title}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                value={exQuestionType}
                onChange={(e) => setExQuestionType(e.target.value)}
                aria-label="Filter tipe soal"
                className="h-11 w-1/2 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-2.5 text-sm text-[var(--plas-text-primary)]"
              >
                <option value="">Semua Tipe</option>
                <option value="MC">MC</option>
                <option value="TF">TF</option>
                <option value="FIB">FIB</option>
              </select>
              <select
                value={exStatus}
                onChange={(e) => setExStatus(e.target.value)}
                aria-label="Filter status latihan"
                className="h-11 w-1/2 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-2.5 text-sm text-[var(--plas-text-primary)]"
              >
                <option value="">Semua Status</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
              </select>
            </div>
          </div>

          {exLoading && !exData ? (
            <SkeletonBlock className="h-64" />
          ) : exData && exData.items.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat latihan sesuai filter"
              description="Coba ubah pilihan kelas, materi, jenis soal, atau status untuk menampilkan riwayat latihan mahasiswa."
            />
          ) : exData ? (
            <div className="overflow-x-auto rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--plas-border-subtle)] bg-[var(--plas-bg-subtle)] text-xs font-semibold text-[var(--plas-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Mahasiswa</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Materi &amp; SubMateri</th>
                    <th className="px-4 py-3">Tipe</th>
                    <th className="px-4 py-3 text-center">Attempt</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Nilai</th>
                    <th className="px-4 py-3">Waktu (WITA)</th>
                    <th className="px-4 py-3 text-right">Inspeksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--plas-border-subtle)]">
                  {exData.items.map((item) => (
                    <tr
                      key={item.attempt_id}
                      className="hover:bg-[var(--plas-bg-canvas)]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--plas-text-primary)]">
                          {item.student_name}
                        </p>
                        <p className="font-mono text-xs text-[var(--plas-text-muted)]">
                          {item.student_nim}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--plas-text-secondary)]">
                        {item.kelas_kode}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--plas-text-primary)]">
                          {item.material_title}
                        </p>
                        <p className="text-xs text-[var(--plas-text-muted)]">
                          {item.submaterial_title}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--plas-brand-primary)]">
                        {item.question_type}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-[var(--plas-text-primary)]">
                        {item.attempt_number}/3
                      </td>
                      <td className="px-4 py-3">
                        <PlasStatusBadge variant={item.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-[var(--plas-text-primary)]">
                        {item.score !== null
                          ? item.score.toFixed(1)
                          : "Belum dikumpulkan"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--plas-text-muted)]">
                        {formatWitaDateTime(item.submitted_at ?? item.started_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAttemptId(item.attempt_id)}
                          className="min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-xs font-semibold text-[var(--plas-text-primary)] hover:bg-[var(--plas-bg-subtle)]"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-5">
          {evError ? (
            <ErrorBanner
              message={evError}
              onRetry={() => void loadEvaluations()}
            />
          ) : null}

          {/* Ringkasan Evaluasi */}
          {evData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4">
                <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                  Rata-rata Pre-Test ({evData.summary.pre_submitted_count} mhs)
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-text-primary)]">
                  {evData.summary.avg_pre_score !== null
                    ? evData.summary.avg_pre_score.toFixed(2)
                    : "Belum ada"}
                </p>
              </div>
              <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4">
                <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                  Rata-rata Post-Test ({evData.summary.post_submitted_count} mhs)
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-brand-primary)]">
                  {evData.summary.avg_post_score !== null
                    ? evData.summary.avg_post_score.toFixed(2)
                    : "Belum ada"}
                </p>
              </div>
              <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4">
                <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                  Selisih Berpasangan ({evData.summary.paired_count} pasang)
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-success-text)]">
                  {evData.summary.paired_avg_delta !== null
                    ? `${evData.summary.paired_avg_delta >= 0 ? "+" : ""}${evData.summary.paired_avg_delta.toFixed(2)}`
                    : "Belum lengkap"}
                </p>
              </div>
            </div>
          ) : evLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          ) : null}

          {/* Toolbar Filter & Unduh CSV */}
          <div className="flex flex-col gap-3 rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <SearchMagnifier className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--plas-text-muted)]" />
                <input
                  type="search"
                  value={evSearch}
                  onChange={(e) => setEvSearch(e.target.value)}
                  placeholder="Cari nama atau NIM mahasiswa..."
                  aria-label="Cari evaluasi mahasiswa"
                  className="h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white pl-10 pr-3 text-sm text-[var(--plas-text-primary)]"
                />
              </div>

              <select
                value={evKelasId}
                onChange={(e) => setEvKelasId(e.target.value)}
                aria-label="Filter kelas evaluasi"
                className="h-11 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
              >
                <option value="">Semua Kelas</option>
                {(evData?.classes ?? []).map((cls) => (
                  <option key={cls.kelas_id} value={cls.kelas_id}>
                    {cls.kode} ({cls.nama})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-start gap-1 lg:items-end">
              <button
                type="button"
                disabled={!evKelasId || exportingCsv}
                aria-disabled={!evKelasId || exportingCsv}
                title={
                  !evKelasId
                    ? "Pilih kelas spesifik terlebih dahulu untuk mengunduh CSV"
                    : "Unduh laporan evaluasi CSV"
                }
                onClick={() => void handleExportEvaluationsCsv()}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-[var(--plas-radius-md)] px-4 text-sm font-semibold transition-colors ${
                  !evKelasId || exportingCsv
                    ? "cursor-not-allowed border border-[var(--plas-disabled-border)] bg-[var(--plas-disabled-bg)] text-[var(--plas-disabled-text)]"
                    : "cursor-pointer bg-[var(--plas-brand-primary)] text-white hover:bg-[var(--plas-brand-hover)]"
                }`}
              >
                <DownloadTray className="h-4 w-4" />
                <span>{exportingCsv ? "Mengunduh..." : "Unduh CSV"}</span>
              </button>
              {!evKelasId ? (
                <p className="text-xs text-[var(--plas-text-muted)]">
                  Pilih kelas spesifik terlebih dahulu untuk mengunduh CSV
                </p>
              ) : null}
            </div>
          </div>

          {evLoading && !evData ? (
            <SkeletonBlock className="h-64" />
          ) : evData && evData.items.length === 0 ? (
            <EmptyState
              title="Belum ada data evaluasi mahasiswa"
              description="Mahasiswa terdaftar pada kelas yang Anda ampu akan muncul pada tabel evaluasi di sini."
            />
          ) : evData ? (
            <div className="overflow-x-auto rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--plas-border-subtle)] bg-[var(--plas-bg-subtle)] text-xs font-semibold text-[var(--plas-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Mahasiswa</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3 text-right">Skor Pre-Test</th>
                    <th className="px-4 py-3 text-right">Skor Post-Test</th>
                    <th className="px-4 py-3 text-right">Selisih (Post - Pre)</th>
                    <th className="px-4 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--plas-border-subtle)]">
                  {evData.items.map((row) => (
                    <tr
                      key={row.mahasiswa_id}
                      className="hover:bg-[var(--plas-bg-canvas)]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--plas-text-primary)]">
                          {row.nama}
                        </p>
                        <p className="font-mono text-xs text-[var(--plas-text-muted)]">
                          {row.nim}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--plas-text-secondary)]">
                        {row.kelas_kode}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--plas-text-primary)]">
                        {row.pre_score !== null
                          ? row.pre_score.toFixed(1)
                          : "Belum dikumpulkan"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-[var(--plas-brand-primary)]">
                        {row.post_score !== null
                          ? row.post_score.toFixed(1)
                          : "Belum dikumpulkan"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono text-xs font-bold ${
                          row.delta_score === null
                            ? "text-[var(--plas-text-muted)]"
                            : row.delta_score >= 0
                              ? "text-[var(--plas-success-text)]"
                              : "text-[var(--plas-error-text)]"
                        }`}
                      >
                        {row.delta_score !== null
                          ? `${row.delta_score >= 0 ? "+" : ""}${row.delta_score.toFixed(1)}`
                          : "Belum lengkap"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedMahasiswaId(row.mahasiswa_id)}
                          className="min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-xs font-semibold text-[var(--plas-text-primary)] hover:bg-[var(--plas-bg-subtle)]"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      )}

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
