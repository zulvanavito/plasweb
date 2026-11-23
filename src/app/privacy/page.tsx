import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PlasAppLogo } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | PLAS (PLAS-TypeScript)",
  description:
    "Kebijakan Privasi resmi PLAS (Programming Learning Assistant System) - PLAS-TypeScript mengenai akses data akun Google, penyimpanan di Supabase, dan perlindungan privasi pengguna.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--plas-bg-canvas)] text-[var(--plas-text-primary)]">
      <header className="border-b border-[var(--plas-border-subtle)] bg-[var(--plas-bg-surface)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <PlasAppLogo className="h-9 w-9 shrink-0" />
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
                PLAS // DOKUMEN PUBLIK
              </p>
              <p className="text-sm font-bold text-[var(--plas-text-primary)]">
                PLAS-TypeScript
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] px-3.5 text-sm font-semibold text-[var(--plas-text-secondary)] transition-colors hover:bg-[var(--plas-bg-subtle)] hover:text-[var(--plas-text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Beranda PLAS</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--plas-brand-hover)]"
            >
              Masuk Portal Dosen
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <article className="rounded-[var(--plas-radius-xl)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-6 sm:p-10">
          <p className="font-mono text-xs font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
            KEBIJAKAN PRIVASI // PRIVACY POLICY
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--plas-text-primary)] sm:text-3xl">
            Kebijakan Privasi PLAS (PLAS-TypeScript)
          </h1>
          <p className="mt-2 text-xs text-[var(--plas-text-muted)]">
            Berlaku untuk aplikasi mobile mahasiswa dan portal web dosen PLAS-TypeScript.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--plas-text-secondary)]">
            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                1. Identitas Layanan
              </h2>
              <p className="mt-2">
                <strong>PLAS (Programming Learning Assistant System) - PLAS-TypeScript</strong>{" "}
                adalah sistem pembelajaran pemrograman TypeScript untuk lingkungan akademik yang
                mencakup aplikasi mobile mahasiswa dan Web Dashboard Analitik serta Manajemen Kelas
                untuk dosen pengampu.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                2. Data Akun Google yang Diakses
              </h2>
              <p className="mt-2">
                Saat Anda memilih masuk menggunakan Google Sign-In, sistem hanya meminta izin scope
                standar Google Identity (<code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">openid</code>,{" "}
                <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">email</code>, dan{" "}
                <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">profile</code>).
                Informasi yang diterima meliputi:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>Alamat email</strong> akun Google untuk identifikasi dan otorisasi akun.
                </li>
                <li>
                  <strong>Nama lengkap atau nama tampilan</strong> untuk profil mahasiswa maupun
                  dosen di dalam kelas akademik.
                </li>
                <li>
                  <strong>Info profil dasar</strong> (pengenal unik Google dan metadata profil dasar
                  dari ID token) untuk verifikasi sesi autentikasi.
                </li>
              </ul>
              <p className="mt-2">
                PLAS tidak meminta akses ke Google Drive, Gmail, Kalender, Kontak, atau data
                pribadi Google lainnya di luar informasi autentikasi dasar tersebut.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                3. Tujuan Penggunaan Data
              </h2>
              <p className="mt-2">Data yang dikumpulkan digunakan secara terbatas untuk:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Melakukan autentikasi akun mahasiswa dan akun dosen pengampu di ekosistem
                  PLAS-TypeScript.
                </li>
                <li>
                  Memetakan keanggotaan mahasiswa ke dalam kelas akademik yang dikelola dosen.
                </li>
                <li>
                  Menyimpan riwayat pengerjaan materi, latihan, Pre-Test, Post-Test, serta kuota
                  penggunaan asisten AI Socratic.
                </li>
                <li>
                  Menampilkan analitik evaluasi pembelajaran kepada dosen pengampu kelas terkait.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                4. Penyimpanan dan Keamanan Data di Supabase
              </h2>
              <p className="mt-2">
                Data autentikasi dan catatan pembelajaran disimpan pada infrastruktur{" "}
                <strong>Supabase</strong> (Supabase Auth dan PostgreSQL) dengan komunikasi
                terenkripsi HTTPS/TLS, verifikasi token JWT, serta penerapan{" "}
                <em>Row-Level Security</em> (RLS) dan peran database berhak akses minimum (
                <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
                  plas_api
                </code>
                ). Mahasiswa hanya dapat mengakses data miliknya sendiri, dan dosen hanya dapat
                mengakses data mahasiswa pada kelas yang diampu.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                5. Pernyataan Tidak Menjual atau Membagikan Data ke Pihak Ketiga
              </h2>
              <p className="mt-2">
                PLAS <strong>tidak pernah menjual, menyewakan, memperdagangkan, atau membagikan</strong>{" "}
                data pribadi maupun data akun Google pengguna kepada pihak ketiga mana pun untuk
                tujuan komersial, periklanan, atau pelacakan lintas layanan. Saat mahasiswa
                menggunakan fitur AI Socratic pada aplikasi mobile, sistem hanya mengirimkan konteks
                materi dan pertanyaan latihan tanpa menyertakan email atau identitas pribadi
                pengguna.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                6. Hak Pengguna dan Kontak Pengembang
              </h2>
              <p className="mt-2">
                Anda dapat meminta peninjauan, pembaruan, atau penghapusan data akun Anda dari
                sistem PLAS-TypeScript dengan menghubungi pengembang melalui email{" "}
                <a
                  href="mailto:zavitoanwari@gmail.com"
                  className="font-semibold text-[var(--plas-brand-primary)] underline underline-offset-2"
                >
                  zavitoanwari@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </main>

      <footer className="border-t border-[var(--plas-border-subtle)] bg-[var(--plas-bg-surface)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-5 text-xs text-[var(--plas-text-muted)] sm:px-6">
          <p>PLAS (Programming Learning Assistant System) - PLAS-TypeScript</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="font-medium hover:text-[var(--plas-text-primary)]">
              Beranda
            </Link>
            <Link href="/terms" className="font-medium hover:text-[var(--plas-text-primary)]">
              Ketentuan Layanan
            </Link>
            <Link href="/login" className="font-medium hover:text-[var(--plas-text-primary)]">
              Masuk Portal Dosen
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
