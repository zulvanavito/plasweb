"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityPulse,
  LayoutDashboard,
  LogOut,
  MenuBars,
  PlasAppLogo,
  UsersGroup,
  XClose,
} from "@/components/ui/icons";
import {
  getInitials,
  lecturerFetch,
  LecturerClientError,
} from "@/lib/api/lecturer-client";
import type {
  LecturerDashboardDto,
  LecturerIdentityDto,
} from "@/lib/dto/lecturer-mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "Data Kelas", icon: UsersGroup },
  {
    href: "/activities",
    label: "Aktivitas Pembelajaran",
    icon: ActivityPulse,
  },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [lecturer, setLecturer] = useState<LecturerIdentityDto | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        if (!data.session) {
          router.replace("/login");
          return;
        }
        try {
          const summary = await lecturerFetch<LecturerDashboardDto>(
            "/api/lecturer/dashboard"
          );
          if (!active) return;
          setLecturer(summary.lecturer);
          setAuthReady(true);
        } catch (err) {
          if (!active) return;
          if (err instanceof LecturerClientError && err.status === 403) {
            await supabase.auth.signOut();
            router.replace("/login?error=forbidden");
            return;
          }
          if (err instanceof LecturerClientError && err.status === 401) {
            await supabase.auth.signOut();
            router.replace("/login");
            return;
          }
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--plas-bg-canvas)] px-4">
        <div className="w-full max-w-sm rounded-[var(--plas-radius-lg)] border border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] p-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-[var(--plas-radius-md)] bg-[var(--plas-brand-tint)]" />
          <p className="text-sm font-medium text-[var(--plas-text-muted)]">
            Memuat ruang kerja dosen...
          </p>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[var(--plas-bg-surface)] p-4">
      <div>
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2.5">
            <PlasAppLogo className="h-9 w-9 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[var(--plas-text-primary)]">
                PLAS-TypeScript
              </p>
              <p className="font-mono text-[10px] font-semibold tracking-wider text-[var(--plas-brand-primary)] uppercase">
                READ-ONLY DOSEN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup navigasi"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--plas-radius-md)] text-[var(--plas-text-muted)] hover:bg-[var(--plas-bg-subtle)] lg:hidden"
          >
            <XClose className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Menu utama dosen" className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex min-h-[44px] items-center gap-3 rounded-[var(--plas-radius-md)] px-3 text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-[var(--plas-brand-tint)] text-[var(--plas-brand-primary)]"
                    : "text-[var(--plas-text-secondary)] hover:bg-[var(--plas-bg-subtle)] hover:text-[var(--plas-text-primary)]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[var(--plas-border-subtle)] pt-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--plas-brand-tint)] font-mono text-xs font-bold text-[var(--plas-brand-primary)]">
            {getInitials(lecturer?.nama ?? "Dosen")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--plas-text-primary)]">
              {lecturer?.nama ?? "Dosen Pengampu"}
            </p>
            <p className="truncate font-mono text-[11px] text-[var(--plas-text-muted)]">
              {lecturer?.nidn ? `NIDN ${lecturer.nidn}` : "Akun Terverifikasi"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] bg-white px-3 text-[13px] font-semibold text-[var(--plas-text-primary)] transition-colors hover:bg-[var(--plas-bg-subtle)]"
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--plas-bg-canvas)] lg:flex">
      {/* Sidebar Desktop 240px */}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Drawer Mobile / Tablet */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 flex bg-[#0F172A]/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="h-full w-64 border-r border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)]"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar responsif (< 1024px) */}
        <header className="flex items-center justify-between border-b border-[var(--plas-border-divider)] bg-[var(--plas-bg-surface)] px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-2 rounded-[var(--plas-radius-md)] border border-[var(--plas-border-interactive)] px-3 text-sm font-semibold text-[var(--plas-text-primary)]"
          >
            <MenuBars className="h-5 w-5" />
            <span>Menu</span>
          </button>
          <div className="flex items-center gap-2">
            <PlasAppLogo className="h-6 w-6 shrink-0" />
            <span className="font-mono text-xs font-semibold text-[var(--plas-brand-primary)]">
              PLAS-TypeScript
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
