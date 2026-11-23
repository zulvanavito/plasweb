"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EvaluationDetailModal } from "@/components/lecturer/evaluation-detail-modal";
import {
  ArrowLeft,
  DownloadTray,
  SearchMagnifier,
} from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/owl-mascot";
import { ErrorBanner, SkeletonBlock } from "@/components/ui/states";
import {
  downloadLecturerCsv,
  lecturerFetch,
  LecturerClientError,
} from "@/lib/api/lecturer-client";
import type { LecturerClassDetailDto } from "@/lib/dto/lecturer-mappers";

export default function ClassDetailPage() {
  const params = useParams<{ kelasId: string }>();
  const kelasId = params?.kelasId ?? "";

  const [data, setData] = useState<LecturerClassDetailDto | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedMahasiswaId, setSelectedMahasiswaId] = useState<string | null>(
    null
  );

  const loadDetail = useCallback(async () => {
    if (!kelasId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await lecturerFetch<LecturerClassDetailDto>(
        `/api/lecturer/classes/${encodeURIComponent(kelasId)}`
      );
      setData(res);
    } catch (err) {
      setError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal memuat detail kelas."
      );
    } finally {
      setLoading(false);
    }
  }, [kelasId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data) return [];
    if (!q) return data.students;
    return data.students.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) || s.nim.toLowerCase().includes(q)
    );
  }, [data, search]);

  async function handleExportCsv() {
    if (!data) return;
    setExporting(true);
    setError(null);
    try {
      await downloadLecturerCsv(
        data.kelas.kelas_id,
        `evaluasi-${data.kelas.kode}.csv`
      );
    } catch (err) {
      setError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal mengunduh CSV evaluasi kelas."
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/classes"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3.5 text-sm font-semibold text-[var(--plas-text-primary)] hover:bg-[var(--plas-bg-subtle)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Data Kelas</span>
        </Link>

        {data ? (
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={exporting}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--plas-brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--plas-disabled-bg)] disabled:text-[var(--plas-disabled-text)]"
          >
            <DownloadTray className="h-4 w-4" />
            <span>{exporting ? "Mengunduh..." : "Unduh CSV"}</span>
          </button>
        ) : null}
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={() => void loadDetail()} />
      ) : null}

      {loading && !data ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-64" />
        </div>
      ) : data ? (
        <>
          <header className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
            <p className="font-mono text-xs font-semibold text-[var(--plas-brand-primary)]">
              {data.kelas.kode}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--plas-text-primary)]">
              {data.kelas.nama}
            </h1>
            <p className="mt-1 text-sm text-[var(--plas-text-secondary)]">
              Dosen Pengampu: {data.kelas.dosen_nama} | {data.kelas.tahun_akademik}{" "}
              Semester {data.kelas.semester} | {data.kelas.student_count}{" "}
              Mahasiswa
            </p>
          </header>

          <div className="relative">
            <SearchMagnifier className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--plas-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari mahasiswa berdasarkan nama atau NIM..."
              aria-label="Cari mahasiswa di kelas"
              className="h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white pl-10 pr-3 text-sm text-[var(--plas-text-primary)]"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <EmptyState
              title="Belum ada mahasiswa terdaftar di kelas ini."
              description="Mahasiswa yang memilih kode kelas ini melalui aplikasi mobile akan tampil di sini."
            />
          ) : (
            <div className="overflow-x-auto rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--plas-border-subtle)] bg-[var(--plas-bg-subtle)] text-xs font-semibold text-[var(--plas-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">NIM</th>
                    <th className="px-4 py-3">Nama Mahasiswa</th>
                    <th className="px-4 py-3 text-right">Latihan Selesai</th>
                    <th className="px-4 py-3 text-right">Rata-rata Latihan</th>
                    <th className="px-4 py-3 text-right">Pre-Test</th>
                    <th className="px-4 py-3 text-right">Post-Test</th>
                    <th className="px-4 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--plas-border-subtle)]">
                  {filteredStudents.map((s) => (
                    <tr key={s.mahasiswa_id} className="hover:bg-[var(--plas-bg-canvas)]">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--plas-text-primary)]">
                        {s.nim}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--plas-text-primary)]">
                        {s.nama}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--plas-text-secondary)]">
                        {s.submitted_exercises_count}/20
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--plas-text-primary)]">
                        {s.avg_exercise_score !== null
                          ? s.avg_exercise_score.toFixed(1)
                          : "Belum dikumpulkan"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-[var(--plas-text-primary)]">
                        {s.pre_test_score !== null
                          ? s.pre_test_score.toFixed(1)
                          : "Belum dikumpulkan"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-[var(--plas-brand-primary)]">
                        {s.post_test_score !== null
                          ? s.post_test_score.toFixed(1)
                          : "Belum dikumpulkan"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedMahasiswaId(s.mahasiswa_id)}
                          className="min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-xs font-semibold text-[var(--plas-text-primary)] hover:bg-[var(--plas-bg-subtle)]"
                        >
                          Lihat Evaluasi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      <EvaluationDetailModal
        mahasiswaId={selectedMahasiswaId}
        onClose={() => setSelectedMahasiswaId(null)}
      />
    </div>
  );
}
