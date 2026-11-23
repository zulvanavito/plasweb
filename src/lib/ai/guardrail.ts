import type { QuestionType } from "@/lib/dto/student-mappers";

export interface GuardrailTarget {
  questionType: QuestionType;
  questionText?: string;
  correctOptionText?: string | null;
  correctOptionLetter?: string | null;
  correctBoolean?: boolean | null;
  correctText?: string | null;
}

export interface GuardrailResult {
  ok: boolean;
  reason?: string;
}

const DIRECT_ANSWER_PATTERNS: RegExp[] = [
  /jawaban(?:nya|\s+yang\s+(?:benar|tepat))?\s*(?:adalah|:|yaitu)\b/i,
  /kunci\s+jawaban\s*(?:adalah|:)/i,
  /pilih(?:lah)?\s+(?:opsi|pilihan)\s+[a-d]\b/i,
  /opsi\s+[a-d]\s+(?:adalah|merupakan)\s+(?:jawaban|yang\s+benar|benar)/i,
  /the\s+correct\s+answer\s+is\b/i,
];

const TF_DIRECT_PATTERNS: RegExp[] = [
  /(?:pernyataan|kode|potongan\s+kode|deklarasi|ekspresi|jawaban)(?:nya|\s+(?:di\s+atas|tersebut|ini))?\s+(?:adalah\s+|bernilai\s+|sudah\s+|bersifat\s+)?(?:benar|salah|true|false|valid|tidak\s+valid)\b/i,
  /\b(?:nilainya|jawabannya|statusnya)\s+(?:adalah\s+|yaitu\s+)?[`"']?(?:true|false|benar|salah)[`"']?\b/i,
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function evaluateAiGuardrail(
  responseText: string,
  target?: GuardrailTarget
): GuardrailResult {
  const trimmed = responseText.trim();
  if (trimmed.length < 15) {
    return { ok: false, reason: "empty_or_too_short" };
  }

  for (const pattern of DIRECT_ANSWER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: "direct_answer_phrase" };
    }
  }

  if (!target) {
    return { ok: true };
  }

  if (target.questionType === "MC") {
    if (target.correctOptionLetter) {
      const letter = escapeRegex(target.correctOptionLetter);
      const letterLeak = new RegExp(
        `\\b(?:opsi|pilihan|huruf)\\s+${letter}\\b(?:\\s+(?:benar|tepat|jawaban))?`,
        "i"
      );
      if (letterLeak.test(trimmed)) {
        return { ok: false, reason: "mc_key_leak" };
      }
    }

    if (target.correctOptionText && target.correctOptionText.trim().length > 0) {
      const cleanOpt = target.correctOptionText.replace(/`/g, "").trim();
      if (cleanOpt.length >= 2) {
        const directChoose = new RegExp(
          `(?:pilih|gunakan|pakai|jawab|adalah|yaitu)\\s+[^.\\n]{0,20}${escapeRegex(cleanOpt)}`,
          "i"
        );
        if (directChoose.test(trimmed)) {
          return { ok: false, reason: "mc_key_leak" };
        }
      }
    }
  } else if (target.questionType === "TF") {
    for (const pattern of TF_DIRECT_PATTERNS) {
      if (pattern.test(trimmed)) {
        return { ok: false, reason: "tf_key_leak" };
      }
    }
  } else if (target.questionType === "FIB") {
    const key = target.correctText?.trim() ?? "";
    if (key.length > 0) {
      const escapedKey = escapeRegex(key);
      const directCommand = new RegExp(
        `(?:isi(?:kan)?|ketik(?:kan)?|tulis(?:kan)?|lengkapi|masukkan|ganti(?:kan)?\\s+bagian\\s+kosong|ganti\\s+_+)\\s+(?:dengan\\s+|kata\\s+kunci\\s+|operator\\s+)?[\`"']?${escapedKey}[\`"']?`,
        "i"
      );
      if (directCommand.test(trimmed)) {
        return { ok: false, reason: "fib_key_leak" };
      }

      if (target.questionText && target.questionText.includes("_____")) {
        const linesWithBlank = target.questionText
          .split(/\r?\n/)
          .filter((l) => l.includes("_____"));
        for (const blankLine of linesWithBlank) {
          const filledLine = blankLine
            .replace("_____", key)
            .replace(/\s+/g, " ")
            .trim();
          const normalizedResponse = trimmed.replace(/\s+/g, " ");
          if (filledLine.length >= 6 && normalizedResponse.includes(filledLine)) {
            return { ok: false, reason: "fib_key_leak" };
          }
        }
      }
    }
  }

  return { ok: true };
}
