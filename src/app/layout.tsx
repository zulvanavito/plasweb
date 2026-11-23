import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLAS-TypeScript | Dashboard Analitik Dosen & API",
  description:
    "Platform pembelajaran pemrograman TypeScript dengan dashboard analitik dosen read-only dan layanan REST API terpadu.",
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
