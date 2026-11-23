"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  EyeOffOutline,
  EyeOutline,
  LockOutline,
  MailOutline,
  PlasAppLogo,
} from "@/components/ui/icons";
import { lecturerFetch, LecturerClientError } from "@/lib/api/lecturer-client";
import type { LecturerDashboardDto } from "@/lib/dto/lecturer-mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface GisCredentialResponse {
  credential?: string;
}

interface GisIdApi {
  initialize: (config: {
    client_id: string;
    nonce?: string;
    callback: (response: GisCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
    }
  ) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GisIdApi;
      };
    };
  }
}

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function createNoncePair(): Promise<{
  rawNonce: string;
  hashedNonce: string;
}> {
  const randomBytes = new Uint8Array(16);
  window.crypto.getRandomValues(randomBytes);
  const rawNonce = toHex(randomBytes);

  const encoded = new TextEncoder().encode(rawNonce);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  const hashedNonce = toHex(new Uint8Array(digest));

  return { rawNonce, hashedNonce };
}

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
  const [gisReady, setGisReady] = useState(false);
  const [nonceVersion, setNonceVersion] = useState(0);

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const rawNonceRef = useRef<string | null>(null);

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

    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      setGisReady(true);
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

  const handleGoogleCredentialResponse = useCallback(
    async (response: GisCredentialResponse) => {
      const idToken = response.credential;
      const rawNonce = rawNonceRef.current;

      if (!idToken || !rawNonce) {
        setErrorCode("unauthorized");
        setErrorMessage("Token autentikasi Google tidak valid. Silakan coba lagi.");
        setNonceVersion((v) => v + 1);
        return;
      }

      setErrorCode(null);
      setErrorMessage(null);
      setSubmitting(true);

      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
          nonce: rawNonce,
        });

        if (error) {
          setErrorCode("unauthorized");
          setErrorMessage(
            "Gagal masuk dengan Google. Pastikan akun Google Anda aktif dan coba lagi."
          );
          return;
        }

        await verifyLecturerAccess();
      } catch {
        setErrorCode("server_error");
        setErrorMessage("Gagal menghubungkan layanan autentikasi Google.");
      } finally {
        setSubmitting(false);
        setNonceVersion((v) => v + 1);
      }
    },
    [verifyLecturerAccess]
  );

  useEffect(() => {
    if (checkingSession || !gisReady || !GOOGLE_CLIENT_ID) return;
    const container = googleButtonRef.current;
    const gisId = window.google?.accounts?.id;
    if (!container || !gisId) return;

    let cancelled = false;

    void createNoncePair()
      .then(({ rawNonce, hashedNonce }) => {
        if (cancelled) return;
        rawNonceRef.current = rawNonce;
        container.innerHTML = "";

        const width = Math.min(394, Math.max(240, container.clientWidth || 380));
        gisId.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashedNonce,
          callback: (resp) => {
            void handleGoogleCredentialResponse(resp);
          },
        });
        gisId.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          width,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setErrorCode("server_error");
          setErrorMessage("Perangkat tidak mendukung kriptografi browser untuk Google Sign-In.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [checkingSession, gisReady, nonceVersion, handleGoogleCredentialResponse]);

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--plas-bg-canvas)] px-4 py-10">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />

      <div className="w-full max-w-[460px] rounded-[var(--plas-radius-xl)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <PlasAppLogo className="h-10 w-10 shrink-0" />
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
          Masuk menggunakan akun dosen terdaftar pada PLAS-TypeScript untuk mengelola kelas serta
          memantau aktivitas latihan dan evaluasi mahasiswa secara Read-Only.
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

            {GOOGLE_CLIENT_ID ? (
              <div className="space-y-2">
                <div
                  ref={googleButtonRef}
                  aria-label="Masuk dengan Google"
                  className={`flex min-h-[44px] w-full items-center justify-center ${
                    submitting ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {!gisReady ? (
                    <div className="h-10 w-full animate-pulse rounded-[var(--plas-radius-sm)] bg-[var(--plas-bg-subtle)]" />
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                role="status"
                className="rounded-[var(--plas-radius-md)] border border-[var(--plas-warning-border)] bg-[var(--plas-warning-bg)] p-3 text-xs leading-relaxed text-[var(--plas-warning-text)]"
              >
                Login Google Identity Services belum aktif karena variabel lingkungan{" "}
                <code className="font-mono font-semibold">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>{" "}
                belum dikonfigurasi. Gunakan email dan kata sandi dosen di atas atau lengkapi
                konfigurasi Client ID Google Web.
              </div>
            )}
          </>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--plas-border-subtle)] pt-4 text-xs text-[var(--plas-text-muted)]">
          <Link
            href="/"
            className="font-medium text-[var(--plas-text-secondary)] hover:text-[var(--plas-text-primary)]"
          >
            Beranda PLAS
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/privacy"
              className="font-medium hover:text-[var(--plas-text-primary)]"
            >
              Kebijakan Privasi
            </Link>
            <Link
              href="/terms"
              className="font-medium hover:text-[var(--plas-text-primary)]"
            >
              Ketentuan Layanan
            </Link>
          </div>
        </footer>
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
