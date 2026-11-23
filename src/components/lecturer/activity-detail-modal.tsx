"use client";

import { useEffect, useState } from "react";
import { QuestionTextRenderer } from "@/components/ui/plas-code-block";
import { PlasStatusBadge } from "@/components/ui/plas-status-badge";
import { ErrorBanner, ReadOnlyModal, SkeletonBlock } from "@/components/ui/states";
import {
  formatDurationSeconds,
  formatWitaDateTime,
  lecturerFetch,
  LecturerClientError,
} from "@/lib/api/lecturer-client";
import type { LecturerActivityDetailDto } from "@/lib/dto/lecturer-mappers";

export function ActivityDetailModal({
  attemptId,
  onClose,
}: {
  attemptId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<LecturerActivityDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!attemptId) {
      setData(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    lecturerFetch<LecturerActivityDetailDto>(
      `/api/lecturer/activities/${encodeURIComponent(attemptId)}`
    )
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof LecturerClientError
            ? err.message
            : "Gagal memuat detail aktivitas latihan."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attemptId, reloadTick]);

  return (
    <ReadOnlyModal
      open={attemptId !== null}
      onClose={onClose}
      title="Detail Aktivitas Latihan (Read-Only)"
      subtitle={
        data
          ? `${data.student_name} (${data.student_nim}) | Kelas ${data.kelas_kode} | Attempt ${data.attempt_number}/3`
          : "Memuat rincian jawaban dan kunci jawaban..."
      }
    >
      {loading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-20" />
          <SkeletonBlock className="h-44" />
        </div>
      ) : error ? (
        <ErrorBanner
          message={error}
          onRetry={() => setReloadTick((n) => n + 1)}
        />
      ) : data ? (
        <div className="space-y-5">
          {/* Metadata ringkas */}
          <div className="grid grid-cols-1 gap-3 rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-canvas)] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-[var(--plas-text-muted)]">
                Materi &amp; SubMateri
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--plas-text-primary)]">
                {data.material_title}
              </p>
              <p className="text-xs text-[var(--plas-text-secondary)]">
                {data.submaterial_title}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--plas-text-muted)]">
                Status &amp; Nilai
              </p>
              <div className="mt-1 flex items-center gap-2">
                <PlasStatusBadge
                  variant={data.status === "SUBMITTED" ? "SUBMITTED" : "IN_PROGRESS"}
                />
                <span className="font-mono text-sm font-bold text-[var(--plas-text-primary)]">
                  {data.score !== null ? data.score.toFixed(1) : "Belum dikumpulkan"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--plas-text-muted)]">
                Waktu &amp; Durasi
              </p>
              <p className="mt-0.5 text-xs text-[var(--plas-text-secondary)]">
                Mulai: {formatWitaDateTime(data.started_at)}
              </p>
              <p className="text-xs text-[var(--plas-text-secondary)]">
                Selesai: {formatWitaDateTime(data.submitted_at)}
              </p>
              <p className="mt-0.5 font-mono text-xs font-medium text-[var(--plas-text-muted)]">
                Durasi: {formatDurationSeconds(data.total_duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--plas-text-muted)]">
                Ringkasan Jawaban
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--plas-success-text)]">
                Benar: {data.correct_count}
              </p>
              <p className="text-sm font-semibold text-[var(--plas-error-text)]">
                Salah: {data.incorrect_count}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-divider)] bg-[var(--plas-brand-tint)] px-3.5 py-2.5 text-xs text-[var(--plas-brand-hover)]">
            <span>
              Tipe Soal: <strong className="font-mono">{data.question_type}</strong>
            </span>
            <span>
              Metode Evaluasi FIB:{" "}
              <strong className="font-semibold">{data.fib_evaluation_method}</strong>
            </span>
          </div>

          {/* Daftar rincian soal */}
          <div className="space-y-4">
            {data.items.map((item) => (
              <div
                key={item.question_id}
                className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-[var(--plas-radius-sm)] bg-[var(--plas-bg-subtle)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--plas-text-primary)]">
                      Soal {item.sequence}
                    </span>
                    <span className="font-mono text-xs text-[var(--plas-text-muted)]">
                      Durasi: {formatDurationSeconds(item.time_spent_seconds)}
                    </span>
                  </div>
                  {item.is_correct === true ? (
                    <PlasStatusBadge variant="BENAR" />
                  ) : item.is_correct === false ? (
                    <PlasStatusBadge variant="SALAH" />
                  ) : (
                    <PlasStatusBadge variant="NOT_STARTED" label="Belum dijawab" />
                  )}
                </div>

                <QuestionTextRenderer text={item.question_text} />

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] p-3">
                    <p className="text-xs font-semibold text-[var(--plas-text-muted)]">
                      Jawaban Mahasiswa
                    </p>
                    <p className="mt-1 font-mono text-sm text-[var(--plas-text-primary)]">
                      {item.student_answer_display ?? "Belum dijawab"}
                    </p>
                  </div>

                  <div className="rounded-[var(--plas-radius-md)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-subtle)] p-3">
                    <p className="text-xs font-semibold text-[var(--plas-brand-primary)]">
                      Kunci Jawaban (Read-Only Dosen - P13)
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[var(--plas-text-primary)]">
                      {item.correct_answer_display}
                    </p>
                  </div>
                </div>

                {item.explanation ? (
                  <div className="mt-3 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-brand-tint)] px-3.5 py-2.5 text-xs text-[var(--plas-text-secondary)]">
                    <strong className="font-semibold text-[var(--plas-brand-hover)]">
                      Pembahasan Konsep:{" "}
                    </strong>
                    {item.explanation}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </ReadOnlyModal>
  );
}
