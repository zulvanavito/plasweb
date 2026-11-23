import type { AiHintLevel, QuestionType } from "@/lib/dto/student-mappers";

export interface SocraticPromptContext {
  submaterialTitle?: string;
  submaterialContent?: string;
  questionText?: string;
  questionType?: QuestionType;
  options?: Array<{ label: string; text: string }>;
}

const LEVEL_GUIDANCE: Record<AiHintLevel, string> = {
  1: [
    "Level 1 (Konsep Dasar):",
    "- Jelaskan konsep fundamental TypeScript yang relevan dengan pertanyaan secara singkat dan ramah pemula.",
    "- Gunakan analogi atau contoh mini yang BERBEDA dari soal aktif.",
    "- Akhiri dengan 1 pertanyaan reflektif ringan agar mahasiswa mengecek pemahamannya.",
  ].join("\n"),
  2: [
    "Level 2 (Strategi):",
    "- Bantu mahasiswa membedah bagian kode atau pola sintaksis yang perlu diperiksa langkah demi langkah.",
    "- Tunjukkan cara mengeliminasi kesalahan umum tanpa menunjuk opsi/jawaban yang benar.",
    "- Akhiri dengan 1 pertanyaan pengarah untuk membantu memilih strategi sendiri.",
  ].join("\n"),
  3: [
    "Level 3 (Penalaran):",
    "- Berikan penalaran logis paling dekat menuju solusi beserta pertanyaan pemicu yang mendorong mahasiswa menarik kesimpulan sendiri.",
    "- Tetap DILARANG menyebut jawaban akhir, huruf opsi benar, nilai boolean final, atau kata kunci isian secara langsung.",
  ].join("\n"),
};

export function buildSocraticSystemInstruction(hintLevel: AiHintLevel): string {
  return [
    "Anda adalah AI Learning Assistant PLAS-TypeScript dalam mode Socratic untuk mahasiswa pemula.",
    "Aturan wajib yang tidak boleh dilanggar:",
    "1. Gunakan bahasa Indonesia yang jelas, ringkas, dan akademis.",
    "2. DILARANG KERAS menyebutkan jawaban akhir, huruf opsi yang benar (A/B/C/D), nilai boolean final (true/false/benar/salah atas pernyataan soal), atau teks pengisi bagian kosong secara langsung.",
    "3. DILARANG memakai emoji maupun tanda baca em-dash.",
    "4. Bimbing mahasiswa memahami konsep TypeScript dan akhiri respons dengan pertanyaan pengarah.",
    "",
    LEVEL_GUIDANCE[hintLevel],
  ].join("\n");
}

export function buildSocraticUserPrompt(
  studentQuestion: string,
  context: SocraticPromptContext
): string {
  const parts: string[] = [];

  if (context.submaterialTitle || context.submaterialContent) {
    parts.push("Konteks Materi:");
    if (context.submaterialTitle) {
      parts.push(`Judul SubMateri: ${context.submaterialTitle}`);
    }
    if (context.submaterialContent) {
      const trimmed = context.submaterialContent.slice(0, 1500);
      parts.push(trimmed);
    }
  }

  if (context.questionText) {
    parts.push("Konteks Soal Latihan (tanpa kunci jawaban):");
    if (context.questionType) {
      parts.push(`Tipe Soal: ${context.questionType}`);
    }
    parts.push(context.questionText);
    if (context.options && context.options.length > 0) {
      parts.push("Daftar Opsi:");
      for (const opt of context.options) {
        parts.push(`- ${opt.label}. ${opt.text}`);
      }
    }
  }

  parts.push(`Pertanyaan Mahasiswa:\n${studentQuestion}`);
  return parts.join("\n\n");
}

export function buildGuardrailCorrectionPrompt(
  originalUserPrompt: string,
  rejectedDraft: string,
  reason: string
): string {
  return [
    originalUserPrompt,
    "",
    `PERBAIKAN WAJIB (draft sebelumnya ditolak guardrail karena alasan "${reason}"):`,
    "Jangan menulis ulang jawaban langsung atau menyebut opsi/nilai/kata kunci solusi dari soal.",
    "Tulis ulang petunjuk Socratic yang hanya menjelaskan konsep/strategi dan akhiri dengan pertanyaan pengarah.",
    `Ringkasan panjang draft ditolak: ${rejectedDraft.length} karakter.`,
  ].join("\n");
}
