import { ApiError } from "@/lib/http/errors";

export const MAX_FIB_LENGTH = 255;
export const FIB_SIMILARITY_THRESHOLD = 0.7;

export function normalizeFibAnswer(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const aCode = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = aCode === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[b.length]!;
}

export function evaluateFibAnswer(
  studentAnswer: string,
  expectedAnswer: string
): boolean {
  if (studentAnswer.length > MAX_FIB_LENGTH) {
    throw new ApiError(422, "invalid_answer");
  }

  const normStudent = normalizeFibAnswer(studentAnswer);
  const normExpected = normalizeFibAnswer(expectedAnswer);

  if (normStudent.length === 0 && normExpected.length === 0) {
    return true;
  }
  if (normStudent.length === 0 || normExpected.length === 0) {
    return false;
  }

  const maxLen = Math.max(normStudent.length, normExpected.length);
  const similarity = 1 - levenshteinDistance(normStudent, normExpected) / maxLen;
  // Tolak pembulatan biner IEEE-754 tepat di batas 0.70 (mis. 1 - 3/10 = 0.7)
  return similarity + 1e-12 >= FIB_SIMILARITY_THRESHOLD;
}

export function evaluateMcAnswer(
  selectedOptionId: string,
  validOptionIds: readonly string[],
  correctOptionId: string
): boolean {
  if (!validOptionIds.includes(selectedOptionId)) {
    throw new ApiError(422, "invalid_option");
  }
  return selectedOptionId === correctOptionId;
}
