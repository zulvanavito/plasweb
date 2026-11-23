"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  CodeBrackets,
  SearchMagnifier,
  UsersGroup,
} from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/owl-mascot";
import { ErrorBanner, SkeletonBlock } from "@/components/ui/states";
import { lecturerFetch, LecturerClientError } from "@/lib/api/lecturer-client";
import type { LecturerClassesResponseDto } from "@/lib/dto/lecturer-mappers";

export default function ClassesPage() {
  const [search, setSearch] = useState("");
  const [tahun, setTahun] = useState("");
  const [semester, setSemester] = useState("");
  const [data, setData] = useState<LecturerClassesResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (tahun) params.set("tahun_akademik", tahun);
    if (semester) params.set("semester", semester);
    const qs = params.toString();

    try {
      const res = await lecturerFetch<LecturerClassesResponseDto>(
        `/api/lecturer/classes${qs ? `?${qs}` : ""}`
      );
      setData(res);
    } catch (err) {
      setError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal memuat daftar kelas."
      );
    } finally {
      setLoading(false);
    }
  }, [search, tahun, semester]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
          READ-ONLY // DATA KELAS
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--plas-text-primary)]">
          Data Kelas Diampu
        </h1>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={() => void loadClasses()} />
      ) : null}

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
          <SkeletonBlock className="h-64" />
        </div>
      ) : data ? (
        <>
          {/* 3 Kartu KPI Kelas */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                    Total Kelas Diampu
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-text-primary)]">
                    {data.kpi.total_classes}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]">
                  <CodeBrackets className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                    Total Mahasiswa Kelas
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-text-primary)]">
                    {data.kpi.total_students}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]">
                  <UsersGroup className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                    Rata-rata Mahasiswa per Kelas
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-text-primary)]">
                    {data.kpi.avg_students_per_class.toFixed(1)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]">
                  <UsersGroup className="h-5 w-5" />
                </div>
              </div>
            </div>
          </section>

          {/* Toolbar Pencarian & Filter */}
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4">
            <div className="relative min-w-[220px] flex-1">
              <SearchMagnifier className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--plas-text-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau kode kelas..."
                aria-label="Cari kelas"
                className="h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white pl-10 pr-3 text-sm text-[var(--plas-text-primary)]"
              />
            </div>

            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              aria-label="Filter tahun akademik"
              className="h-11 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            >
              <option value="">Semua Tahun Akademik</option>
              {data.filter_options.tahun_akademik.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              aria-label="Filter semester"
              className="h-11 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            >
              <option value="">Semua Semester</option>
              {data.filter_options.semester.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {data.items.length === 0 ? (
            <EmptyState
              title="Belum ada kelas sesuai filter"
              description="Ubah kata kunci pencarian atau filter tahun akademik/semester untuk melihat daftar kelas."
            />
          ) : (
            <>
              {/* Tabel Desktop Read-Only */}
              <div className="hidden overflow-x-auto rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[var(--plas-border-subtle)] bg-[var(--plas-bg-subtle)] text-xs font-semibold text-[var(--plas-text-muted)]">
                    <tr>
                      <th className="px-4 py-3">Kode Kelas</th>
                      <th className="px-4 py-3">Nama Kelas</th>
                      <th className="px-4 py-3">Tahun Akademik</th>
                      <th className="px-4 py-3">Semester</th>
                      <th className="px-4 py-3 text-right">Mahasiswa</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--plas-border-subtle)]">
                    {data.items.map((cls) => (
                      <tr
                        key={cls.kelas_id}
                        className="hover:bg-[var(--plas-bg-canvas)]"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--plas-brand-primary)]">
                          {cls.kode}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--plas-text-primary)]">
                          {cls.nama}
                        </td>
                        <td className="px-4 py-3 text-[var(--plas-text-secondary)]">
                          {cls.tahun_akademik}
                        </td>
                        <td className="px-4 py-3 text-[var(--plas-text-secondary)]">
                          {cls.semester}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--plas-text-primary)]">
                          {cls.student_count}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/classes/${cls.kelas_id}`}
                            className="inline-flex min-h-[44px] items-center gap-1 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-xs font-semibold text-[var(--plas-text-primary)] transition-colors hover:bg-[var(--plas-bg-subtle)]"
                          >
                            <span>Detail Kelas</span>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Kartu Mobile (< 768px) */}
              <div className="space-y-3 md:hidden">
                {data.items.map((cls) => (
                  <div
                    key={cls.kelas_id}
                    className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-[var(--plas-brand-primary)]">
                          {cls.kode}
                        </span>
                        <h3 className="mt-0.5 text-base font-semibold text-[var(--plas-text-primary)]">
                          {cls.nama}
                        </h3>
                      </div>
                      <span className="rounded-[var(--plas-radius-sm)] bg-[var(--plas-bg-subtle)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--plas-text-primary)]">
                        {cls.student_count} mhs
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--plas-text-muted)]">
                      {cls.tahun_akademik} | Semester {cls.semester}
                    </p>
                    <Link
                      href={`/classes/${cls.kelas_id}`}
                      className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm font-semibold text-[var(--plas-text-primary)]"
                    >
                      <span>Buka Detail Kelas</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
