"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CodeBrackets,
  EyeOffOutline,
  EyeOutline,
  GoogleLogoVector,
  LockOutline,
  MailOutline,
} from "@/components/ui/icons";
import { lecturerFetch, LecturerClientError } from "@/lib/api/lecturer-client";
import type { LecturerDashboardDto } from "@/lib/dto/lecturer-mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyLecturerAccess = useCallback(async () => {
    try {
      await lecturerFetch<LecturerDashboardDto>("/api/lecturer/dashboard");
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof LecturerClientError && err.status === 403) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        setErrorCode("forbidden");
        setErrorMessage(
          "Akses ditolak (403 Forbidden). Akun ini tidak terdaftar sebagai Dosen Pengampu pada sistem PLAS-TypeScript."
        );
      } else if (err instanceof LecturerClientError && err.status === 401) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      } else {
        setErrorCode("server_error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Gagal memverifikasi peran dosen."
        );
      }
      setCheckingSession(false);
    }
  }, [router]);

  useEffect(() => {
    const queryError = searchParams.get("error");
    if (queryError === "forbidden") {
      setErrorCode("forbidden");
      setErrorMessage(
        "Akses ditolak (403 Forbidden). Akun ini tidak terdaftar sebagai Dosen Pengampu pada sistem PLAS-TypeScript."
      );
    }

    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data.session) {
          void verifyLecturerAccess();
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (mounted) setCheckingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, [searchParams, verifyLecturerAccess]);

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setErrorCode(null);
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorCode("validation_error");
      setErrorMessage("Masukkan email dosen dan kata sandi terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorCode("unauthorized");
        setErrorMessage("Email atau kata sandi tidak valid.");
        return;
      }

      await verifyLecturerAccess();
    } catch {
      setErrorCode("server_error");
      setErrorMessage("Tidak dapat menghubungi layanan autentikasi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorCode(null);
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setErrorCode("unauthorized");
        setErrorMessage("Gagal memulai login dengan Google.");
        setSubmitting(false);
      }
    } catch {
      setErrorCode("server_error");
      setErrorMessage("Gagal menghubungkan layanan Google Sign-In.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--plas-bg-canvas)] px-4 py-10">
      <div className="w-full max-w-[460px] rounded-[var(--plas-radius-xl)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]">
            <CodeBrackets className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
              CS LAB ENV // PORTAL DOSEN
            </p>
            <h1 className="text-xl font-bold text-[var(--plas-text-primary)]">
              Masuk Dashboard Dosen
            </h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-[var(--plas-text-secondary)]">
          Masuk menggunakan akun dosen terdaftar untuk memantau kelas, aktivitas
          latihan, dan evaluasi mahasiswa secara Read-Only.
        </p>

        {errorMessage ? (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-[var(--plas-radius-md)] border border-[var(--plas-error-border)] bg-[var(--plas-error-bg)] p-3.5 text-sm text-[var(--plas-error-text)]"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                {errorCode === "forbidden" ? "Akses Dibatasi" : "Gagal Masuk"}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        ) : null}

        {checkingSession ? (
          <div className="space-y-3 py-4">
            <div className="h-11 animate-pulse rounded-[var(--plas-radius-md)] bg-[var(--plas-bg-subtle)]" />
            <div className="h-11 animate-pulse rounded-[var(--plas-radius-md)] bg-[var(--plas-bg-subtle)]" />
            <p className="text-center text-xs text-[var(--plas-text-muted)]">
              Memeriksa sesi dosen...
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="dosen-email"
                  className="mb-1.5 block text-[13px] font-semibold text-[var(--plas-text-primary)]"
                >
                  Email Dosen
                </label>
                <div className="relative">
                  <MailOutline className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--plas-text-muted)]" />
                  <input
                    id="dosen-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama.dosen@undiksha.ac.id"
                    className="h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white pl-10 pr-3 text-sm text-[var(--plas-text-primary)] placeholder:text-[var(--plas-text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="dosen-password"
                  className="mb-1.5 block text-[13px] font-semibold text-[var(--plas-text-primary)]"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <LockOutline className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--plas-text-muted)]" />
                  <input
                    id="dosen-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="h-11 w-full rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white pl-10 pr-12 text-sm text-[var(--plas-text-primary)] placeholder:text-[var(--plas-text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                    }
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[var(--plas-radius-sm)] text-[var(--plas-text-muted)] hover:bg-[var(--plas-bg-subtle)]"
                  >
                    {showPassword ? (
                      <EyeOffOutline className="h-5 w-5" />
                    ) : (
                      <EyeOutline className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--plas-brand-hover)] disabled:cursor-not-allowed disabled:bg-[var(--plas-disabled-bg)] disabled:text-[var(--plas-disabled-text)]"
              >
                {submitting ? "Memproses..." : "Masuk Dashboard"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--plas-border-subtle)]" />
              <span className="text-xs font-medium text-[var(--plas-text-muted)]">
                atau
              </span>
              <div className="h-px flex-1 bg-[var(--plas-border-subtle)]" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-4 text-sm font-semibold text-[var(--plas-text-primary)] transition-colors hover:bg-[var(--plas-bg-subtle)] disabled:cursor-not-allowed disabled:bg-[var(--plas-disabled-bg)] disabled:text-[var(--plas-disabled-text)]"
            >
              <GoogleLogoVector className="h-5 w-5" />
              <span>Masuk dengan Google</span>
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--plas-bg-canvas)] px-4">
          <div className="h-96 w-full max-w-[460px] animate-pulse rounded-[var(--plas-radius-xl)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)]" />
        </main>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
