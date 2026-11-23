"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ClassFormModal,
  ConfirmActionModal,
} from "@/components/lecturer/class-form-modal";
import {
  ChevronRight,
  CodeBrackets,
  PencilSquare,
  PlusIcon,
  SearchMagnifier,
  TrashCan,
  UsersGroup,
} from "@/components/ui/icons";
import { InfoPopover } from "@/components/ui/info-popover";
import { EmptyState } from "@/components/ui/owl-mascot";
import { ErrorBanner, SkeletonBlock } from "@/components/ui/states";
import {
  lecturerFetch,
  lecturerMutate,
  LecturerClientError,
} from "@/lib/api/lecturer-client";
import type {
  LecturerClassesResponseDto,
  LecturerClassSummaryDto,
} from "@/lib/dto/lecturer-mappers";

export default function ClassesPage() {
  const [search, setSearch] = useState("");
  const [tahun, setTahun] = useState("");
  const [semester, setSemester] = useState("");
  const [data, setData] = useState<LecturerClassesResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] =
    useState<LecturerClassSummaryDto | null>(null);
  const [deletingClass, setDeletingClass] =
    useState<LecturerClassSummaryDto | null>(null);

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
            MANAJEMEN // DATA KELAS
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <h1 className="text-2xl font-bold text-[var(--plas-text-primary)]">
              Data Kelas Diampu
            </h1>
            <InfoPopover
              label="Info Manajemen Kelas"
              description="Menghapus kelas atau mengeluarkan mahasiswa tidak menghapus riwayat nilai latihan maupun tes mahasiswa. Saat mahasiswa bergabung ke kelas lain di aplikasi mobile, seluruh riwayat nilainya otomatis tersinkron kembali."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingClass(null);
            setFormOpen(true);
          }}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--plas-brand-hover)]"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Buat Kelas Baru</span>
        </button>
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
              description="Buat kelas baru atau ubah kata kunci pencarian dan filter tahun akademik/semester untuk melihat daftar kelas."
            />
          ) : (
            <>
              {/* Tabel Desktop */}
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
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingClass(cls);
                                setFormOpen(true);
                              }}
                              aria-label={`Edit kelas ${cls.kode}`}
                              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-xs font-semibold text-[var(--plas-text-primary)] transition-colors hover:bg-[var(--plas-bg-subtle)]"
                            >
                              <PencilSquare className="h-4 w-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingClass(cls)}
                              aria-label={`Hapus kelas ${cls.kode}`}
                              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[var(--plas-radius-md)] border border-[var(--plas-error-border)] bg-[var(--plas-error-bg)] px-3 text-xs font-semibold text-[var(--plas-error-text)] transition-opacity hover:opacity-90"
                            >
                              <TrashCan className="h-4 w-4" />
                              <span>Hapus</span>
                            </button>
                            <Link
                              href={`/classes/${cls.kelas_id}`}
                              className="inline-flex min-h-[44px] items-center gap-1 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-xs font-semibold text-[var(--plas-text-primary)] transition-colors hover:bg-[var(--plas-bg-subtle)]"
                            >
                              <span>Detail Kelas</span>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
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
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClass(cls);
                          setFormOpen(true);
                        }}
                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-xs font-semibold text-[var(--plas-text-primary)]"
                      >
                        <PencilSquare className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingClass(cls)}
                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--plas-radius-md)] border border-[var(--plas-error-border)] bg-[var(--plas-error-bg)] px-3 text-xs font-semibold text-[var(--plas-error-text)]"
                      >
                        <TrashCan className="h-4 w-4" />
                        <span>Hapus</span>
                      </button>
                    </div>
                    <Link
                      href={`/classes/${cls.kelas_id}`}
                      className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-1 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm font-semibold text-[var(--plas-text-primary)]"
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

      <ClassFormModal
        open={formOpen}
        mode={editingClass ? "edit" : "create"}
        initialClass={editingClass}
        onClose={() => {
          setFormOpen(false);
          setEditingClass(null);
        }}
        onSaved={() => {
          setFormOpen(false);
          setEditingClass(null);
          void loadClasses();
        }}
      />

      <ConfirmActionModal
        open={deletingClass !== null}
        title={
          deletingClass
            ? `Hapus Kelas ${deletingClass.kode}?`
            : "Hapus Kelas?"
        }
        description={
          deletingClass
            ? `Kelas "${deletingClass.nama}" (${deletingClass.student_count} mahasiswa) akan dihapus. Mahasiswa yang masih tergabung akan otomatis menjadi Pengguna Umum dan seluruh hasil Pre-Test, Post-Test, serta latihan mereka tetap tersimpan dan langsung tersinkron saat memasukkan kode kelas baru.`
            : ""
        }
        confirmLabel="Ya, Hapus Kelas"
        confirmingLabel="Menghapus..."
        onClose={() => setDeletingClass(null)}
        onConfirm={async () => {
          if (!deletingClass) return;
          await lecturerMutate<{ deleted_kelas_id: string }>(
            `/api/lecturer/classes/${encodeURIComponent(deletingClass.kelas_id)}`,
            { method: "DELETE" }
          );
          setDeletingClass(null);
          await loadClasses();
        }}
      />
    </div>
  );
}
