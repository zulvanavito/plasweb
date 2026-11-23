import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PlasAppLogo } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Ketentuan Layanan | PLAS (PLAS-TypeScript)",
  description:
    "Ketentuan Layanan resmi PLAS (Programming Learning Assistant System) - PLAS-TypeScript untuk penggunaan pembelajaran akademik, akun dosen dan mahasiswa, serta kontak pengembang.",
};

export default function TermsOfServicePage() {
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
            KETENTUAN LAYANAN // TERMS OF SERVICE
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--plas-text-primary)] sm:text-3xl">
            Ketentuan Layanan PLAS (PLAS-TypeScript)
          </h1>
          <p className="mt-2 text-xs text-[var(--plas-text-muted)]">
            Ketentuan penggunaan platform pembelajaran dan pengelolaan kelas akademik PLAS-TypeScript.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--plas-text-secondary)]">
            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                1. Penerimaan Ketentuan &amp; Ruang Lingkup Layanan
              </h2>
              <p className="mt-2">
                Dengan mengakses atau menggunakan{" "}
                <strong>PLAS (Programming Learning Assistant System) - PLAS-TypeScript</strong>{" "}
                baik melalui aplikasi mobile mahasiswa maupun Web Dashboard Dosen, Anda menyetujui
                untuk mematuhi ketentuan penggunaan akademik ini. Layanan disediakan untuk mendukung
                pembelajaran sintaksis dasar bahasa pemrograman TypeScript serta pemantauan progres
                akademik di kelas.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                2. Batasan Akun Mahasiswa dan Dosen
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Akun Mahasiswa:</strong> Digunakan melalui aplikasi mobile PLAS-TypeScript
                  untuk mengakses materi pembelajaran, mengerjakan latihan soal, mengikuti Pre-Test
                  dan Post-Test, memilih kelas akademik, serta berinteraksi dengan asisten AI
                  Socratic 3-level sesuai kuota harian yang ditetapkan.
                </li>
                <li>
                  <strong>Akun Dosen Pengampu:</strong> Digunakan melalui Web Portal{" "}
                  <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
                    /login
                  </code>{" "}
                  khusus oleh dosen yang terdaftar pada sistem. Dosen memiliki wewenang untuk
                  membuat, memperbarui, dan menghapus kelas yang diampu, mengeluarkan mahasiswa dari
                  kelas, serta meninjau aktivitas dan hasil evaluasi mahasiswa secara Read-Only.
                </li>
                <li>
                  <strong>Pembatasan Akses Portal Web:</strong> Akun non-dosen yang mencoba masuk ke
                  Web Dashboard Dosen akan ditolak secara otomatis oleh sistem otorisasi (403
                  Forbidden).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                3. Integritas Akademik &amp; Penggunaan yang Dilarang
              </h2>
              <p className="mt-2">Pengguna dilarang keras untuk:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Mengakses API di luar alur resmi aplikasi, mencoba memintas kontrol akses
                  berbasis peran, atau mengupayakan pengambilan kunci jawaban soal sebelum
                  penyelesaian latihan/tes.
                </li>
                <li>
                  Menggunakan akun orang lain, mendaftarkan identitas akademik palsu, atau
                  mengganggu ketersediaan layanan PLAS-TypeScript.
                </li>
                <li>
                  Menyalahgunakan asisten AI Socratic di luar tujuan pembelajaran konstruktif.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                4. Data Akademik, Privasi, dan Ketersediaan Layanan
              </h2>
              <p className="mt-2">
                Pengelolaan data akun Google dan catatan akademik mengikuti{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-[var(--plas-brand-primary)] underline underline-offset-2"
                >
                  Kebijakan Privasi PLAS-TypeScript
                </Link>
                . Pengembang berupaya menjaga keandalan sistem, namun dapat melakukan pemeliharaan
                terjadwal atau pembaruan materi serta fitur akademik sewaktu-waktu.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                5. Kontak Pengembang
              </h2>
              <p className="mt-2">
                Untuk pertanyaan, dukungan teknis, maupun pelaporan kendala terkait platform
                PLAS-TypeScript, silakan hubungi pengembang melalui alamat email{" "}
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
            <Link href="/privacy" className="font-medium hover:text-[var(--plas-text-primary)]">
              Kebijakan Privasi
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
