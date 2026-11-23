import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/verify-token";
import { mapErrorToResponse } from "@/lib/http/errors";
import { requireIdempotencyKey } from "@/lib/http/idempotency";
import { askAiOrchestrator } from "@/lib/services/student-ai";
import { aiAskSchema, parseJsonPayload } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const requestId = requireIdempotencyKey(request);
    const body = await parseJsonPayload(request, aiAskSchema);
    const result = await askAiOrchestrator(auth, body, requestId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
