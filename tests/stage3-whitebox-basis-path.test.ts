import { describe, expect, it } from "vitest";
import { evaluateAiGuardrail } from "@/lib/ai/guardrail";
import {
  evaluateFibAnswer,
  evaluateMcAnswer,
} from "@/lib/domain/answer-evaluator";
import { parseCanonicalAnswer } from "@/lib/validation/schemas";

const OPT_1 = "11111111-1111-4111-8111-111111111111";
const OPT_2 = "22222222-2222-4222-8222-222222222222";
const OPT_OUTSIDE = "33333333-3333-4333-8333-333333333333";

/**
 * Pengujian White Box Basis Path (P14 / Proposal §3.6.2):
 * Menutup jalur independen V(G) = E - N + 2P pada:
 * (1) Evaluator FIB & MC
 * (2) Validator bentuk jawaban kanonis P6
 * (3) Output Guardrail AI Socratic
 */
describe("Tahap 3 — White Box Basis Path Testing (P14)", () => {
  it("Basis Path 1: evaluateFibAnswer & evaluateMcAnswer menempuh semua cabang keputusan", () => {
    // Path 1: string > 255 karakter -> 422 invalid_answer
    expect(() => evaluateFibAnswer("x".repeat(256), "const")).toThrowError(
      expect.objectContaining({ status: 422, code: "invalid_answer" })
    );

    // Path 2: kedua string kosong setelah normalisasi -> true
    expect(evaluateFibAnswer("   ", " ")).toBe(true);

    // Path 3: salah satu kosong -> false
    expect(evaluateFibAnswer("   ", "const")).toBe(false);

    // Path 4: kunci operator '-' tetap valid pasca normalisasi
    expect(evaluateFibAnswer("  -  ", "-")).toBe(true);

    // Path 5: batas presisi Levenshtein Similarity tepat 0.70 -> true
    expect(evaluateFibAnswer("abcdefghij", "abcdefgxxx")).toBe(true);

    // Path 6: di bawah ambang 0.70 (0.60) -> false
    expect(evaluateFibAnswer("abcdefghij", "abcdefxxxx")).toBe(false);

    // Path 7-9: evaluateMcAnswer (opsi di luar snapshot -> OP001, salah -> false, benar -> true)
    expect(() =>
      evaluateMcAnswer(OPT_OUTSIDE, [OPT_1, OPT_2], OPT_1)
    ).toThrowError(expect.objectContaining({ status: 422, code: "invalid_option" }));
    expect(evaluateMcAnswer(OPT_2, [OPT_1, OPT_2], OPT_1)).toBe(false);
    expect(evaluateMcAnswer(OPT_1, [OPT_1, OPT_2], OPT_1)).toBe(true);
  });

  it("Basis Path 2: parseCanonicalAnswer menegakkan seluruh cabang P6/AN001", () => {
    // Path 1: non-object / array
    expect(() => parseCanonicalAnswer(["bad"])).toThrowError(
      expect.objectContaining({ status: 422, code: "invalid_answer" })
    );

    // Path 2: jumlah key != 1 (kosong atau extra key)
    expect(() => parseCanonicalAnswer({})).toThrowError(
      expect.objectContaining({ status: 422, code: "invalid_answer" })
    );
    expect(() =>
      parseCanonicalAnswer({ type: "MC", option_id: OPT_1 })
    ).toThrowError(expect.objectContaining({ status: 422, code: "invalid_answer" }));

    // Path 3: key tidak dikenali
    expect(() => parseCanonicalAnswer({ text: "let" })).toThrowError(
      expect.objectContaining({ status: 422, code: "invalid_answer" })
    );

    // Path 4: option_id bukan UUID
    expect(() => parseCanonicalAnswer({ option_id: "invalid" })).toThrowError(
      expect.objectContaining({ status: 422, code: "invalid_answer" })
    );

    // Path 5: option_id valid
    expect(parseCanonicalAnswer({ option_id: OPT_1 })).toEqual({
      option_id: OPT_1,
    });

    // Path 6: value boolean valid
    expect(parseCanonicalAnswer({ value: false })).toEqual({ value: false });

    // Path 7: value string > 255 ditolak, <= 255 diterima
    expect(() =>
      parseCanonicalAnswer({ value: "a".repeat(256) })
    ).toThrowError(expect.objectContaining({ status: 422, code: "invalid_answer" }));
    expect(() => parseCanonicalAnswer({ value: 123 })).toThrowError(
      expect.objectContaining({ status: 422, code: "invalid_answer" })
    );
    expect(parseCanonicalAnswer({ value: "else if" })).toEqual({
      value: "else if",
    });
  });

  it("Basis Path 3: evaluateAiGuardrail memblokir seluruh pola kebocoran kunci dan meloloskan petunjuk Socratic", () => {
    // Path 1: respons terlalu pendek / kosong
    expect(evaluateAiGuardrail("   singkat ")).toEqual({
      ok: false,
      reason: "empty_or_too_short",
    });

    // Path 2: frasa jawaban langsung
    expect(
      evaluateAiGuardrail(
        "Setelah dianalisis, jawaban yang benar adalah menggunakan kata kunci tersebut."
      )
    ).toEqual({ ok: false, reason: "direct_answer_phrase" });

    // Path 3: MC key leak via huruf opsi atau teks opsi
    expect(
      evaluateAiGuardrail("Perhatikan opsi A benar untuk kondisi tersebut.", {
        questionType: "MC",
        correctOptionLetter: "A",
        correctOptionText: "`else if`",
      })
    ).toEqual({ ok: false, reason: "mc_key_leak" });

    expect(
      evaluateAiGuardrail(
        "Untuk kasus ini sebaiknya langsung pilih else if saja.",
        {
          questionType: "MC",
          correctOptionLetter: "A",
          correctOptionText: "`else if`",
        }
      )
    ).toEqual({ ok: false, reason: "mc_key_leak" });

    // Path 4: TF key leak
    expect(
      evaluateAiGuardrail(
        "Jika dilihat dari sintaksisnya, pernyataan di atas adalah salah karena tanda kutip.",
        { questionType: "TF", correctBoolean: false }
      )
    ).toEqual({ ok: false, reason: "tf_key_leak" });

    // Path 5: FIB key leak via perintah pengisian langsung atau blok kode terisi penuh
    expect(
      evaluateAiGuardrail(
        "Pada bagian yang kosong, ketik dengan - agar hasilnya tujuh.",
        {
          questionType: "FIB",
          questionText: "let selisih: number = 15 _____ 8;",
          correctText: "-",
        }
      )
    ).toEqual({ ok: false, reason: "fib_key_leak" });

    expect(
      evaluateAiGuardrail(
        "Anda dapat menulis `let selisih: number = 15 - 8;` langsung pada soal tersebut.",
        {
          questionType: "FIB",
          questionText: "let selisih: number = 15 _____ 8;",
          correctText: "-",
        }
      )
    ).toEqual({ ok: false, reason: "fib_key_leak" });

    // Path 6: Respons Socratic valid lolos guardrail
    expect(
      evaluateAiGuardrail(
        "Coba perhatikan dua angka 15 dan 8. Operasi aritmetika apa yang menghasilkan selisih kedua bilangan tersebut?",
        {
          questionType: "FIB",
          questionText: "let selisih: number = 15 _____ 8;",
          correctText: "-",
        }
      )
    ).toEqual({ ok: true });
  });
});
