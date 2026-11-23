"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ErrorBanner, ReadOnlyModal } from "@/components/ui/states";
import { lecturerMutate, LecturerClientError } from "@/lib/api/lecturer-client";
import type { LecturerClassSummaryDto } from "@/lib/dto/lecturer-mappers";

interface ClassFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialClass?: Pick<
    LecturerClassSummaryDto,
    "kelas_id" | "kode" | "nama" | "tahun_akademik" | "semester"
  > | null;
  onClose: () => void;
  onSaved: (saved: LecturerClassSummaryDto) => void;
}

export function ClassFormModal({
  open,
  mode,
  initialClass,
  onClose,
  onSaved,
}: ClassFormModalProps) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [tahunAkademik, setTahunAkademik] = useState("2026/2027");
  const [semester, setSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && initialClass) {
      setKode(initialClass.kode);
      setNama(initialClass.nama);
      setTahunAkademik(initialClass.tahun_akademik);
      setSemester(initialClass.semester === "Genap" ? "Genap" : "Ganjil");
    } else {
      setKode("");
      setNama("");
      setTahunAkademik("2026/2027");
      setSemester("Ganjil");
    }
  }, [open, mode, initialClass]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedKode = kode.trim().toUpperCase();
    const trimmedNama = nama.trim();
    const trimmedTahun = tahunAkademik.trim();

    if (!normalizedKode || !trimmedNama || !/^\d{4}\/\d{4}$/.test(trimmedTahun)) {
      setError(
        "Lengkapi kode kelas, nama kelas, dan tahun akademik dengan format YYYY/YYYY (misalnya 2026/2027)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        kode: normalizedKode,
        nama: trimmedNama,
        tahun_akademik: trimmedTahun,
        semester,
      };

      const saved =
        mode === "edit" && initialClass
          ? await lecturerMutate<LecturerClassSummaryDto>(
              `/api/lecturer/classes/${encodeURIComponent(initialClass.kelas_id)}`,
              { method: "PATCH", body: payload }
            )
          : await lecturerMutate<LecturerClassSummaryDto>(
              "/api/lecturer/classes",
              { method: "POST", body: payload }
            );

      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal menyimpan data kelas."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ReadOnlyModal
      open={open}
      title={mode === "edit" ? "Edit Data Kelas" : "Buat Kelas Baru"}
      subtitle={
        mode === "edit"
          ? "Perbarui identitas kelas agar tetap akurat bagi mahasiswa"
          : "Kode kelas unik ini akan digunakan mahasiswa untuk bergabung via aplikasi mobile"
      }
      onClose={onClose}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? (
          <ErrorBanner title="Gagal Menyimpan Kelas" message={error} />
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="class-kode-input"
              className="block text-xs font-semibold text-[var(--plas-text-secondary)]"
            >
              Kode Kelas
            </label>
            <input
              id="class-kode-input"
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="Contoh: TI-2C-2026"
              maxLength={50}
              required
              disabled={submitting}
              className="mt-1.5 h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 font-mono text-sm uppercase text-[var(--plas-text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="class-tahun-input"
              className="block text-xs font-semibold text-[var(--plas-text-secondary)]"
            >
              Tahun Akademik
            </label>
            <input
              id="class-tahun-input"
              type="text"
              value={tahunAkademik}
              onChange={(e) => setTahunAkademik(e.target.value)}
              placeholder="Contoh: 2026/2027"
              pattern="\d{4}/\d{4}"
              maxLength={20}
              required
              disabled={submitting}
              className="mt-1.5 h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label
              htmlFor="class-nama-input"
              className="block text-xs font-semibold text-[var(--plas-text-secondary)]"
            >
              Nama Kelas
            </label>
            <input
              id="class-nama-input"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Pemrograman TypeScript C"
              maxLength={255}
              required
              disabled={submitting}
              className="mt-1.5 h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="class-semester-select"
              className="block text-xs font-semibold text-[var(--plas-text-secondary)]"
            >
              Semester
            </label>
            <select
              id="class-semester-select"
              value={semester}
              onChange={(e) =>
                setSemester(e.target.value === "Genap" ? "Genap" : "Ganjil")
              }
              disabled={submitting}
              className="mt-1.5 h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-sm text-[var(--plas-text-primary)]"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--plas-border-subtle)] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-4 text-sm font-semibold text-[var(--plas-text-primary)] hover:bg-[var(--plas-bg-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--plas-brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--plas-disabled-bg)] disabled:text-[var(--plas-disabled-text)]"
          >
            {submitting
              ? "Menyimpan..."
              : mode === "edit"
                ? "Simpan Perubahan"
                : "Simpan Kelas"}
          </button>
        </div>
      </form>
    </ReadOnlyModal>
  );
}

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmingLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel,
  confirmingLabel = "Memproses...",
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(
        err instanceof LecturerClientError
          ? err.message
          : "Gagal memproses tindakan."
      );
      setSubmitting(false);
    }
  }

  return (
    <ReadOnlyModal
      open={open}
      title={title}
      subtitle="Konfirmasi tindakan manajemen kelas"
      onClose={onClose}
    >
      <div className="space-y-4">
        {error ? <ErrorBanner title="Tindakan Gagal" message={error} /> : null}
        <p className="text-sm leading-relaxed text-[var(--plas-text-secondary)]">
          {description}
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--plas-border-subtle)] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-4 text-sm font-semibold text-[var(--plas-text-primary)] hover:bg-[var(--plas-bg-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] border border-[var(--plas-error-border)] bg-[var(--plas-error-text)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </ReadOnlyModal>
  );
}
