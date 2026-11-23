import type { Metadata } from "next";
import Link from "next/link";
import {
  ActivityPulse,
  ChevronRight,
  CodeBrackets,
  LayoutDashboard,
  LockClosed,
  PlasAppLogo,
  UsersGroup,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "PLAS (PLAS-TypeScript) | Programming Learning Assistant System",
  description:
    "Beranda resmi PLAS (Programming Learning Assistant System) - PLAS-TypeScript untuk pembelajaran sintaksis dasar TypeScript dengan AI Socratic 3-level dan Dashboard Dosen.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--plas-bg-canvas)] text-[var(--plas-text-primary)]">
      <header className="border-b border-[var(--plas-border-subtle)] bg-[var(--plas-bg-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <PlasAppLogo className="h-10 w-10 shrink-0" />
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
                PLAS // PLAS-TYPESCRIPT
              </p>
              <p className="text-sm font-bold text-[var(--plas-text-primary)]">
                Programming Learning Assistant System
              </p>
            </div>
          </Link>

          <nav
            aria-label="Navigasi publik PLAS"
            className="flex flex-wrap items-center gap-2 sm:gap-4"
          >
            <Link
              href="/privacy"
              className="rounded-[var(--plas-radius-md)] px-3 py-2 text-sm font-medium text-[var(--plas-text-secondary)] transition-colors hover:bg-[var(--plas-bg-subtle)] hover:text-[var(--plas-text-primary)]"
            >
              Kebijakan Privasi
            </Link>
            <Link
              href="/terms"
              className="rounded-[var(--plas-radius-md)] px-3 py-2 text-sm font-medium text-[var(--plas-text-secondary)] transition-colors hover:bg-[var(--plas-bg-subtle)] hover:text-[var(--plas-text-primary)]"
            >
              Ketentuan Layanan
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--plas-brand-hover)]"
            >
              <span>Masuk Portal Dosen</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="rounded-[var(--plas-radius-xl)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-6 sm:p-10">
          <p className="font-mono text-xs font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
            PROGRAMMING LEARNING ASSISTANT SYSTEM // PLAS-TYPESCRIPT
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-[var(--plas-text-primary)] sm:text-4xl">
            PLAS: Asisten Pembelajaran Sintaksis Dasar TypeScript Berbasis AI Socratic &amp; Analitik Akademik
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--plas-text-secondary)]">
            <strong>PLAS (Programming Learning Assistant System) - PLAS-TypeScript</strong>{" "}
            adalah platform pendidikan pemrograman TypeScript terpadu yang menggabungkan aplikasi
            mobile interaktif dengan asisten <strong>AI Socratic 3-level</strong> untuk mahasiswa
            serta <strong>Web Dashboard Analitik &amp; Manajemen Kelas</strong> untuk dosen
            pengampu.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--plas-brand-hover)]"
            >
              <span>Masuk Portal Dosen</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-[44px] items-center rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-[var(--plas-bg-surface)] px-4 text-sm font-semibold text-[var(--plas-text-primary)] transition-colors hover:bg-[var(--plas-bg-subtle)]"
            >
              Kebijakan Privasi
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-[44px] items-center rounded-[var(--plas-radius-md)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-subtle)] px-4 text-sm font-semibold text-[var(--plas-text-secondary)] transition-colors hover:text-[var(--plas-text-primary)]"
            >
              Ketentuan Layanan
            </Link>
          </div>
        </section>

        <section aria-labelledby="ecosystem-heading" className="mt-8">
          <h2
            id="ecosystem-heading"
            className="text-lg font-bold text-[var(--plas-text-primary)]"
          >
            Komponen Ekosistem PLAS-TypeScript
          </h2>
          <p className="mt-1 text-sm text-[var(--plas-text-secondary)]">
            Dirancang untuk mendukung perkuliahan dan latihan mandiri pemrograman TypeScript secara
            terstruktur dan terverifikasi.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <article className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]">
                <CodeBrackets className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[var(--plas-text-primary)]">
                Aplikasi Mobile Mahasiswa (AI Socratic 3-Level)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--plas-text-secondary)]">
                Menyediakan 7 Materi dan 20 Sub-Materi sintaksis dasar TypeScript, latihan soal
                Multiple Choice, True/False, dan Fill in the Blank (evaluasi Levenshtein Similarity
                &gt;= 70%), serta Pre-Test dan Post-Test linear. Asisten AI Socratic 3-level
                memberikan petunjuk bertahap (Konsep Dasar, Strategi, Penalaran) tanpa membocorkan
                kunci jawaban.
              </p>
            </article>

            <article className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[var(--plas-text-primary)]">
                Web Dashboard Analitik &amp; Manajemen Kelas Dosen
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--plas-text-secondary)]">
                Portal khusus dosen pengampu untuk mengelola kelas akademik (pembuatan, pembaruan,
                penghapusan kelas, dan pengelolaan anggota mahasiswa) serta memantau analitik
                progres latihan, perbandingan nilai Pre-Test vs Post-Test berpasangan, dan ekspor
                laporan CSV secara Read-Only.
              </p>
            </article>

            <article className="rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]">
                <LockClosed className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[var(--plas-text-primary)]">
                Autentikasi Google &amp; Perlindungan Data
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--plas-text-secondary)]">
                Autentikasi menggunakan Google Sign-In dengan scope standar{" "}
                <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
                  openid email profile
                </code>{" "}
                untuk memverifikasi identitas akun mahasiswa dan dosen pada sistem PLAS-TypeScript.
                Seluruh data akademik dilindungi PostgreSQL Row-Level Security (RLS) dan tidak
                diperjualbelikan kepada pihak ketiga.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="flex items-start gap-4 rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-surface)] p-5">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-bg-subtle)] text-[var(--plas-brand-primary)]">
              <UsersGroup className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--plas-text-primary)]">
                Akses Terpisah Mahasiswa dan Dosen
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--plas-text-secondary)]">
                Mahasiswa belajar dan mengerjakan evaluasi melalui aplikasi mobile PLAS-TypeScript,
                sedangkan Web Portal di{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[var(--plas-brand-primary)] underline underline-offset-2"
                >
                  /login
                </Link>{" "}
                dikhususkan bagi akun dosen pengampu terdaftar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-subtle)] bg-[var(--plas-bg-surface)] p-5">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--plas-radius-md)] bg-[var(--plas-bg-subtle)] text-[var(--plas-brand-primary)]">
              <ActivityPulse className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--plas-text-primary)]">
                Kepatuhan Privasi &amp; Ketentuan Akademik
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--plas-text-secondary)]">
                Informasi lengkap mengenai akses data Google, penyimpanan Supabase, dan batasan
                layanan tersedia di{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-[var(--plas-brand-primary)] underline underline-offset-2"
                >
                  Kebijakan Privasi
                </Link>{" "}
                dan{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-[var(--plas-brand-primary)] underline underline-offset-2"
                >
                  Ketentuan Layanan
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--plas-border-subtle)] bg-[var(--plas-bg-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-[var(--plas-text-muted)] sm:px-6">
          <div>
            <p className="font-semibold text-[var(--plas-text-secondary)]">
              PLAS (Programming Learning Assistant System) - PLAS-TypeScript
            </p>
            <p className="mt-1">
              Kontak pengembang:{" "}
              <a
                href="mailto:zavitoanwari@gmail.com"
                className="font-medium text-[var(--plas-brand-primary)] underline underline-offset-2"
              >
                zavitoanwari@gmail.com
              </a>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/login" className="font-medium hover:text-[var(--plas-text-primary)]">
              Masuk Portal Dosen
            </Link>
            <Link href="/privacy" className="font-medium hover:text-[var(--plas-text-primary)]">
              Kebijakan Privasi
            </Link>
            <Link href="/terms" className="font-medium hover:text-[var(--plas-text-primary)]">
              Ketentuan Layanan
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
