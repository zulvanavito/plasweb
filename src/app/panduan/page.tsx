import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PlasAppLogo } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Panduan Penggunaan Dosen | PLAS (PLAS-TypeScript)",
  description:
    "Panduan ringkas portal web dosen PLAS (PLAS-TypeScript): alur kerja 3 menu, arti metrik, kesiapan Post-Test 20 latihan, manajemen kelas, evaluasi FIB, dan privasi AI Socratic.",
};

export default function LecturerGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--plas-bg-canvas)] text-[var(--plas-text-primary)]">
      <header className="border-b border-[var(--plas-border-subtle)] bg-[var(--plas-bg-surface)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <PlasAppLogo className="h-9 w-9 shrink-0" />
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
                PLAS // PANDUAN DOSEN
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
            PANDUAN RINGKAS // PORTAL DOSEN
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--plas-text-primary)] sm:text-3xl">
            Panduan Penggunaan Portal Web Dosen PLAS-TypeScript
          </h1>
          <p className="mt-2 text-xs text-[var(--plas-text-muted)]">
            Referensi cepat mengenai navigasi, arti metrik, kesiapan Post-Test, dan pengelolaan
            kelas akademik.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--plas-text-secondary)]">
            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                1. Alur Kerja Portal Dosen (3 Menu Utama &amp; Mode Read-Only)
              </h2>
              <p className="mt-2">
                Setelah masuk melalui{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[var(--plas-brand-primary)] underline underline-offset-2"
                >
                  /login
                </Link>
                , dosen menggunakan tiga menu utama di sidebar:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Dashboard:</strong> Menampilkan ringkasan KPI kelas, distribusi status
                  latihan, perbandingan Pre-Test vs Post-Test, rata-rata skor Materi 01 s.d. 07
                  (beserta sorotan topik tersulit), statistik AI Socratic, progres kesiapan
                  Post-Test, tren aktivitas harian, serta daftar{" "}
                  <em>Aktivitas Pembelajaran Terbaru</em>. Klik salah satu baris aktivitas terbaru
                  untuk langsung membuka modal tinjauan detail latihan atau evaluasi mahasiswa.
                </li>
                <li>
                  <strong>Data Kelas:</strong> Mengelola daftar kelas yang diampu (buat, ubah, dan
                  hapus kelas), meninjau daftar mahasiswa per kelas, mengeluarkan mahasiswa dari
                  kelas, serta mengunduh laporan evaluasi dalam format CSV.
                </li>
                <li>
                  <strong>Aktivitas Pembelajaran:</strong> Menelusuri riwayat latihan dan hasil
                  evaluasi Pre-Test/Post-Test lengkap dengan filter kelas, materi, tipe soal,
                  status, pencarian NIM/nama, serta modal tinjauan jawaban dan kunci jawaban.
                </li>
              </ul>
              <p className="mt-2">
                Seluruh materi, bank soal, dan hasil nilai mahasiswa di portal web bersifat{" "}
                <strong>Read-Only</strong> untuk menjaga konsistensi kurikulum TypeScript serta
                integritas penilaian otomatis dari aplikasi mobile.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                2. Arti Metrik, Status, &amp; Nilai N/A / Belum ada
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Pengecualian Pengguna Umum:</strong> Akun mahasiswa yang belum bergabung
                  ke kelas mana pun (
                  <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
                    kelas_id IS NULL
                  </code>
                  ) tidak disertakan dalam KPI, grafik, maupun tabel analitik dosen.
                </li>
                <li>
                  <strong>Nilai N/A dan Belum ada Bukan 0:</strong> Sesi latihan atau tes yang masih
                  berstatus <em>In Progress</em> / <em>Not Started</em>, atau materi yang belum
                  memiliki kiriman selesai, ditampilkan sebagai <strong>N/A</strong> atau{" "}
                  <strong>Belum ada</strong> dan tidak pernah dianggap bernilai{" "}
                  <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
                    0
                  </code>{" "}
                  agar rata-rata kelas tidak bias turun.
                </li>
                <li>
                  <strong>Pasangan Lengkap Pre-Test vs Post-Test:</strong> Selisih peningkatan nilai
                  hanya dihitung dari mahasiswa yang sudah menyelesaikan Pre-Test dan Post-Test
                  sekaligus.
                </li>
                <li>
                  <strong>Acuan Waktu WITA:</strong> Seluruh stempel waktu, filter tanggal, dan tren
                  harian memakai zona waktu{" "}
                  <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
                    Asia/Makassar
                  </code>{" "}
                  (<strong>WITA</strong>).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                3. Progres Kesiapan Post-Test (Syarat 20 Latihan)
              </h2>
              <p className="mt-2">
                Pada aplikasi mobile, mahasiswa wajib menyelesaikan seluruh{" "}
                <strong>20 latihan</strong> yang tersedia secara kumulatif sebelum Post-Test
                terbuka. Panel <strong>Progres Kesiapan Post-Test</strong> mengelompokkan mahasiswa
                aktif di kelas ke dalam tiga kategori:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Belum Mulai (0 dari 20 latihan):</strong> Mahasiswa belum menyelesaikan
                  satu pun latihan.
                </li>
                <li>
                  <strong>Sedang Berjalan (1 s.d. 19 dari 20 latihan):</strong> Mahasiswa sudah
                  menyelesaikan minimal 1 hingga maksimal 19 latihan berbeda, sehingga masih dalam
                  tahap melengkapi syarat.
                </li>
                <li>
                  <strong>Siap Post-Test (20 dari 20 latihan):</strong> Mahasiswa telah menyelesaikan
                  seluruh 20 latihan dan memenuhi syarat untuk mengerjakan Post-Test.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                4. Manajemen Kelas, Keluarkan Mahasiswa, &amp; Gabung Ulang
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Buat, Ubah, &amp; Hapus Kelas:</strong> Dosen dapat membuat kelas baru
                  dengan kode kelas unik, memperbarui informasi kelas, atau menghapus kelas yang
                  sudah tidak aktif.
                </li>
                <li>
                  <strong>Keluarkan Mahasiswa / Kelas Dihapus:</strong> Jika mahasiswa dikeluarkan
                  dari kelas atau kelasnya dihapus, akun mahasiswa berubah kembali menjadi Pengguna
                  Umum tanpa menghapus riwayat nilai latihan maupun tes. Saat mahasiswa tersebut
                  bergabung ke kelas baru di aplikasi mobile, seluruh riwayat nilainya otomatis
                  tersinkronisasi ke kelas baru.
                </li>
                <li>
                  <strong>Aturan Pindah Kelas Langsung:</strong> Mahasiswa yang sudah menyelesaikan
                  Pre-Test tidak dapat berpindah langsung dari satu kelas aktif ke kelas aktif lain
                  sendirian, kecuali setelah dikeluarkan dosen atau kelas lamanya dihapus.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                5. Metode Penilaian Otomatis (FIB) &amp; Privasi AI Socratic
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Evaluasi Fill in the Blank (FIB):</strong> Jawaban isian singkat
                  dinormalisasi (hapus spasi berlebih dan samakan huruf kecil tanpa menghapus simbol
                  operator) dan dinilai menggunakan metode{" "}
                  <code className="rounded bg-[var(--plas-bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
                    Case-insensitive + Trim + Levenshtein Similarity &gt;= 70%
                  </code>
                  .
                </li>
                <li>
                  <strong>Privasi Statistik AI Socratic:</strong> Asisten AI Socratic 3-level di
                  aplikasi mobile memiliki kuota harian 10 permintaan per mahasiswa yang direset
                  setiap pukul <strong>00:00 WITA</strong>. Panel dosen hanya menampilkan jumlah
                  permintaan berhasil dan jumlah mahasiswa aktif secara agregat anonim tanpa
                  membuka isi prompt atau percakapan siswa.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[var(--plas-text-primary)]">
                6. Bantuan &amp; Kontak Pengembang
              </h2>
              <p className="mt-2">
                Jika muncul pesan <strong>403 Forbidden</strong> saat masuk ke portal web, berarti
                akun Google atau email tersebut belum terdaftar sebagai dosen pengampu di basis
                data PLAS-TypeScript (akun mahasiswa hanya digunakan pada aplikasi mobile). Untuk
                pendaftaran akun dosen, kendala teknis, atau pertanyaan lanjutan, hubungi pengembang
                melalui{" "}
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
            <Link href="/dashboard" className="font-medium hover:text-[var(--plas-text-primary)]">
              Dashboard
            </Link>
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
