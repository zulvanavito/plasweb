import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";
import { ApiError } from "@/lib/http/errors";

export interface AuthContext {
  userId: string;
  role: string;
  email?: string;
}

export interface VerifyTokenOptions {
  supabaseUrl?: string;
  jwtSecret?: string;
  getKey?: JWTVerifyGetKey;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getRemoteJwks(jwksUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const existing = jwksCache.get(jwksUrl);
  if (existing) return existing;
  const created = createRemoteJWKSet(new URL(jwksUrl));
  jwksCache.set(jwksUrl, created);
  return created;
}

export function extractBearerToken(authorizationHeader: string | null): string {
  if (!authorizationHeader) {
    throw new ApiError(401, "unauthorized");
  }
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) {
    throw new ApiError(401, "unauthorized");
  }
  return token;
}

export async function verifyAccessToken(
  token: string,
  options?: VerifyTokenOptions
): Promise<AuthContext> {
  try {
    const header = decodeProtectedHeader(token);
    const rawUrl = (
      options?.supabaseUrl ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      ""
    )
      .trim()
      .replace(/\/+$/, "");
    const secret = (
      options?.jwtSecret ??
      process.env.SUPABASE_JWT_SECRET ??
      ""
    ).trim();

    const issuer = rawUrl ? `${rawUrl}/auth/v1` : undefined;
    const verifyOpts = {
      audience: "authenticated",
      ...(issuer ? { issuer } : {}),
    };

    let payload: Record<string, unknown>;

    if (options?.getKey) {
      const result = await jwtVerify(token, options.getKey, verifyOpts);
      payload = result.payload as Record<string, unknown>;
    } else if (header.alg === "HS256" && secret) {
      const key = new TextEncoder().encode(secret);
      const result = await jwtVerify(token, key, {
        ...verifyOpts,
        algorithms: ["HS256"],
      });
      payload = result.payload as Record<string, unknown>;
    } else {
      if (!rawUrl) {
        throw new ApiError(401, "unauthorized");
      }
      const jwks = getRemoteJwks(`${rawUrl}/auth/v1/.well-known/jwks.json`);
      const result = await jwtVerify(token, jwks, {
        ...verifyOpts,
        algorithms: ["ES256", "RS256", "EdDSA"],
      });
      payload = result.payload as Record<string, unknown>;
    }

    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!UUID_REGEX.test(sub)) {
      throw new ApiError(401, "unauthorized");
    }

    const role =
      typeof payload.role === "string" && payload.role.trim().length > 0
        ? payload.role.trim()
        : "authenticated";
    const email =
      typeof payload.email === "string" && payload.email.trim().length > 0
        ? payload.email.trim()
        : undefined;

    return {
      userId: sub,
      role,
      ...(email ? { email } : {}),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "unauthorized");
  }
}

export async function authenticateRequest(
  request: Request,
  options?: VerifyTokenOptions
): Promise<AuthContext> {
  const token = extractBearerToken(request.headers.get("authorization"));
  return verifyAccessToken(token, options);
}
