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
import type {
  LecturerEvaluationDetailDto,
  LecturerTestAttemptBreakdownDto,
} from "@/lib/dto/lecturer-mappers";

function TestBreakdownSection({
  title,
  attempt,
}: {
  title: string;
  attempt: LecturerTestAttemptBreakdownDto | null;
}) {
  if (!attempt) {
    return (
      <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-canvas)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--plas-text-primary)]">
            {title}
          </h3>
          <PlasStatusBadge variant="NOT_STARTED" />
        </div>
        <p className="mt-2 text-xs text-[var(--plas-text-muted)]">
          Mahasiswa belum memulai sesi tes ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--plas-border-subtle)] pb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--plas-text-primary)]">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--plas-text-muted)]">
            Mulai: {formatWitaDateTime(attempt.started_at)} | Selesai:{" "}
            {formatWitaDateTime(attempt.submitted_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PlasStatusBadge
            variant={attempt.status === "SUBMITTED" ? "SUBMITTED" : "IN_PROGRESS"}
          />
          <span className="font-mono text-sm font-bold text-[var(--plas-text-primary)]">
            {attempt.score !== null ? attempt.score.toFixed(1) : "Belum dikumpulkan"}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {attempt.items.map((item) => (
          <div
            key={`${attempt.attempt_id}-${item.sequence}`}
            className="rounded-[var(--plas-radius-md)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-canvas)] p-3.5"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-[var(--plas-radius-sm)] bg-white px-2 py-0.5 font-mono text-xs font-semibold text-[var(--plas-text-primary)]">
                  No. {item.sequence} ({item.question_type})
                </span>
                <span className="font-mono text-xs text-[var(--plas-text-muted)]">
                  {formatDurationSeconds(item.time_spent_seconds)}
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

            <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
              <div className="rounded-[var(--plas-radius-sm)] border border-[var(--plas-border-subtle)] bg-white p-2.5">
                <p className="text-[11px] font-semibold text-[var(--plas-text-muted)]">
                  Jawaban Mahasiswa
                </p>
                <p className="mt-0.5 font-mono text-xs text-[var(--plas-text-primary)]">
                  {item.student_answer_display ?? "Belum dijawab"}
                </p>
              </div>
              <div className="rounded-[var(--plas-radius-sm)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-subtle)] p-2.5">
                <p className="text-[11px] font-semibold text-[var(--plas-brand-primary)]">
                  Kunci Jawaban (Read-Only Dosen - P13)
                </p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-[var(--plas-text-primary)]">
                  {item.correct_answer_display}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvaluationDetailModal({
  mahasiswaId,
  onClose,
}: {
  mahasiswaId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<LecturerEvaluationDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"PRE" | "POST">("PRE");
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!mahasiswaId) {
      setData(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    lecturerFetch<LecturerEvaluationDetailDto>(
      `/api/lecturer/evaluations/${encodeURIComponent(mahasiswaId)}`
    )
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof LecturerClientError
            ? err.message
            : "Gagal memuat detail evaluasi mahasiswa."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mahasiswaId, reloadTick]);

  return (
    <ReadOnlyModal
      open={mahasiswaId !== null}
      onClose={onClose}
      title="Detail Evaluasi Mahasiswa (Read-Only)"
      subtitle={
        data
          ? `${data.student.nama} (${data.student.nim}) | Kelas ${data.student.kelas_kode}`
          : "Memuat rincian nilai Pre-Test, Post-Test, dan selisih..."
      }
    >
      {loading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-52" />
        </div>
      ) : error ? (
        <ErrorBanner
          message={error}
          onRetry={() => setReloadTick((n) => n + 1)}
        />
      ) : data ? (
        <div className="space-y-5">
          {/* Ringkasan Skor Pre, Post, Selisih */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-canvas)] p-4">
              <p className="text-xs font-medium text-[var(--plas-text-muted)]">
                Skor Pre-Test
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-text-primary)]">
                {data.summary.pre_score !== null
                  ? data.summary.pre_score.toFixed(1)
                  : "Belum dikumpulkan"}
              </p>
              <div className="mt-2">
                <PlasStatusBadge variant={data.summary.pre_status} />
              </div>
            </div>

            <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-canvas)] p-4">
              <p className="text-xs font-medium text-[var(--plas-text-muted)]">
                Skor Post-Test
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[var(--plas-brand-primary)]">
                {data.summary.post_score !== null
                  ? data.summary.post_score.toFixed(1)
                  : "Belum dikumpulkan"}
              </p>
              <div className="mt-2">
                <PlasStatusBadge variant={data.summary.post_status} />
              </div>
            </div>

            <div className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-canvas)] p-4">
              <p className="text-xs font-medium text-[var(--plas-text-muted)]">
                Selisih Nilai (Post - Pre)
              </p>
              <p
                className={`mt-1 font-mono text-2xl font-bold ${
                  data.summary.delta_score === null
                    ? "text-[var(--plas-text-muted)]"
                    : data.summary.delta_score >= 0
                      ? "text-[var(--plas-success-text)]"
                      : "text-[var(--plas-error-text)]"
                }`}
              >
                {data.summary.delta_score !== null
                  ? `${data.summary.delta_score >= 0 ? "+" : ""}${data.summary.delta_score.toFixed(1)}`
                  : "Belum lengkap"}
              </p>
              <p className="mt-2 text-xs text-[var(--plas-text-muted)]">
                Pasangan SUBMITTED
              </p>
            </div>
          </div>

          {/* Sub-tab rincian Pre-Test / Post-Test */}
          <div className="flex gap-2 border-b border-[var(--plas-border-subtle)] pb-2">
            {(["PRE", "POST"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`min-h-[44px] cursor-pointer rounded-[var(--plas-radius-md)] px-4 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[var(--plas-brand-primary)] text-white"
                      : "border border-[var(--plas-border-divider)] bg-white text-[var(--plas-text-secondary)] hover:bg-[var(--plas-bg-subtle)]"
                  }`}
                >
                  {tab === "PRE" ? "Rincian Pre-Test" : "Rincian Post-Test"}
                </button>
              );
            })}
          </div>

          {activeTab === "PRE" ? (
            <TestBreakdownSection
              title="Rincian Jawaban Pre-Test"
              attempt={data.pre_attempt}
            />
          ) : (
            <TestBreakdownSection
              title="Rincian Jawaban Post-Test"
              attempt={data.post_attempt}
            />
          )}
        </div>
      ) : null}
    </ReadOnlyModal>
  );
}
