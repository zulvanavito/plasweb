import { GoogleGenAI } from "@google/genai";
import { ApiError } from "@/lib/http/errors";

export interface AiGenerateInput {
  systemInstruction: string;
  userPrompt: string;
  timeoutMs?: number;
}

export interface AiProvider {
  generate(input: AiGenerateInput): Promise<string>;
}

const DEFAULT_AI_TIMEOUT_MS = 24_000;
const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";

function isAbortOrTimeoutError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") return true;
    if (/abort|timeout/i.test(err.message)) return true;
  }
  return false;
}

function stripThinkingBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .trim();
}

export class GeminiAiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY ?? "",
    model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  ) {
    this.apiKey = apiKey.trim();
    this.model = model.trim() || "gemini-2.5-flash";
  }

  async generate(input: AiGenerateInput): Promise<string> {
    if (!this.apiKey) {
      throw new ApiError(502, "ai_service_error");
    }

    const timeoutMs = input.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });
      const response = await ai.models.generateContent({
        model: this.model,
        contents: input.userPrompt,
        config: {
          systemInstruction: input.systemInstruction,
          temperature: 0.4,
          maxOutputTokens: 512,
          abortSignal: controller.signal,
        },
      });

      const text = response.text?.trim() ?? "";
      if (!text) {
        throw new ApiError(502, "ai_service_error");
      }
      return text;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (controller.signal.aborted || isAbortOrTimeoutError(err)) {
        throw new ApiError(504, "ai_timeout");
      }
      throw new ApiError(502, "ai_service_error");
    } finally {
      clearTimeout(timer);
    }
  }
}

export class GroqAiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    apiKey = process.env.GROQ_API_KEY ?? "",
    model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL
  ) {
    this.apiKey = apiKey.trim();
    this.model = model.trim() || DEFAULT_GROQ_MODEL;
  }

  async generate(input: AiGenerateInput): Promise<string> {
    if (!this.apiKey) {
      throw new ApiError(502, "ai_service_error");
    }

    const timeoutMs = input.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: input.systemInstruction },
            { role: "user", content: input.userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 512,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiError(502, "ai_service_error");
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const rawContent = payload.choices?.[0]?.message?.content ?? "";
      const text = stripThinkingBlocks(rawContent);
      if (!text) {
        throw new ApiError(502, "ai_service_error");
      }
      return text;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (controller.signal.aborted || isAbortOrTimeoutError(err)) {
        throw new ApiError(504, "ai_timeout");
      }
      throw new ApiError(502, "ai_service_error");
    } finally {
      clearTimeout(timer);
    }
  }
}

export class MockSocraticAiProvider implements AiProvider {
  async generate(input: AiGenerateInput): Promise<string> {
    if (input.systemInstruction.includes("Level 3")) {
      return "Pertimbangkan hubungan antara tipe data nilai dan deklarasi di TypeScript. Apa dampak jika tipe anotasi tidak selaras dengan nilainya?";
    }
    if (input.systemInstruction.includes("Level 2")) {
      return "Coba periksa struktur sintaksis langkah demi langkah: kata kunci, tanda baca pemisah, dan kecocokan tipe. Bagian mana yang paling perlu diperhatikan?";
    }
    return "Dalam TypeScript, setiap variabel dan ekspresi mengikuti aturan tipe dan struktur sintaksis yang konsisten. Konsep dasar apa yang muncul pada contoh ini menurut Anda?";
  }
}

export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  if (provider === "mock") {
    return new MockSocraticAiProvider();
  }
  if (provider === "groq") {
    return new GroqAiProvider();
  }
  return new GeminiAiProvider();
}
