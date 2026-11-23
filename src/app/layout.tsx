import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLAS (PLAS-TypeScript) | Platform Pembelajaran TypeScript & Dashboard Dosen",
  description:
    "PLAS (Programming Learning Assistant System) - PLAS-TypeScript: platform pembelajaran sintaksis dasar TypeScript dengan asisten AI Socratic 3-level untuk mahasiswa serta Web Dashboard Analitik dan Manajemen Kelas untuk dosen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[var(--plas-bg-canvas)] text-[var(--plas-text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
