import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export class LecturerClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "LecturerClientError";
    this.status = status;
    this.code = code;
  }
}

async function getAccessTokenOrThrow(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new LecturerClientError(
      401,
      "unauthorized",
      "Sesi login Anda telah berakhir. Silakan masuk kembali."
    );
  }
  return data.session.access_token;
}

export async function lecturerFetch<T>(path: string): Promise<T> {
  const token = await getAccessTokenOrThrow();
  const res = await fetch(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let code = "server_error";
    let message = "Terjadi gangguan saat memuat data dari server.";
    try {
      const payload = (await res.json()) as {
        error?: { code?: string; message?: string };
      };
      if (payload.error?.code) code = payload.error.code;
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // Abaikan parse error jika response non-JSON
    }
    throw new LecturerClientError(res.status, code, message);
  }

  return (await res.json()) as T;
}

export async function downloadLecturerCsv(
  kelasId: string,
  fallbackFileName = "evaluasi-kelas.csv"
): Promise<void> {
  const token = await getAccessTokenOrThrow();
  const url = `/api/lecturer/evaluations/export?kelas_id=${encodeURIComponent(kelasId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/csv",
    },
  });

  if (!res.ok) {
    let code = "server_error";
    let message = "Gagal mengunduh laporan CSV.";
    try {
      const payload = (await res.json()) as {
        error?: { code?: string; message?: string };
      };
      if (payload.error?.code) code = payload.error.code;
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // Abaikan
    }
    throw new LecturerClientError(res.status, code, message);
  }

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  const fileName = match?.[1] ?? fallbackFileName;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function formatWitaDateTime(iso: string | null | undefined): string {
  if (!iso) return "Belum dikumpulkan";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${formatted} WITA`;
}

export function formatDurationSeconds(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs} dtk`;
  return `${mins} mnt ${secs} dtk`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DS";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
