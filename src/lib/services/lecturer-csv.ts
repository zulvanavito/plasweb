export interface LecturerCsvRow {
  nim: string;
  nama: string;
  kelas_kode: string;
  kelas_nama: string;
  pre_status: string;
  pre_score: number | null;
  post_status: string;
  post_score: number | null;
  delta_score: number | null;
}

const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;

export function sanitizeCsvCell(
  value: string | number | null | undefined,
  options?: { numeric?: boolean }
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (options?.numeric) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toFixed(2);
    }
    return "";
  }

  let str = String(value);
  if (FORMULA_PREFIX_REGEX.test(str)) {
    str = `'${str}`;
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function buildEvaluationsCsv(rows: LecturerCsvRow[]): string {
  const header = [
    "NIM",
    "Nama Mahasiswa",
    "Kode Kelas",
    "Nama Kelas",
    "Status Pre-Test",
    "Skor Pre-Test",
    "Status Post-Test",
    "Skor Post-Test",
    "Selisih (Post - Pre)",
  ].join(",");

  const body = rows.map((row) =>
    [
      sanitizeCsvCell(row.nim),
      sanitizeCsvCell(row.nama),
      sanitizeCsvCell(row.kelas_kode),
      sanitizeCsvCell(row.kelas_nama),
      sanitizeCsvCell(row.pre_status),
      sanitizeCsvCell(row.pre_score, { numeric: true }),
      sanitizeCsvCell(row.post_status),
      sanitizeCsvCell(row.post_score, { numeric: true }),
      sanitizeCsvCell(row.delta_score, { numeric: true }),
    ].join(",")
  );

  return [header, ...body].join("\r\n") + "\r\n";
}
