import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import type { AuthContext } from "@/lib/auth/verify-token";

export interface DbClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<T>>;
}

const globalForDb = globalThis as unknown as {
  __plasApiPool?: Pool;
};

export function getPool(): Pool {
  if (globalForDb.__plasApiPool) {
    return globalForDb.__plasApiPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__plasApiPool = pool;
  }

  return pool;
}

/**
 * Executes fn inside an explicit transaction bound to role plas_api and
 * request.jwt.claims via SET LOCAL so RLS & auth.uid() remain isolated per request
 * even on transaction-pooled connections (port 6543, SEC-12).
 */
export async function runWithUserTransaction<T>(
  client: PoolClient,
  auth: AuthContext,
  fn: (db: DbClient) => Promise<T>
): Promise<T> {
  const claims = JSON.stringify({
    sub: auth.userId,
    role: auth.role,
    ...(auth.email ? { email: auth.email } : {}),
  });

  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL ROLE plas_api");
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      claims,
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original failure rather than masking it with rollback errors.
    }
    throw err;
  }
}

export async function withUserTransaction<T>(
  auth: AuthContext,
  fn: (db: DbClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await runWithUserTransaction(client, auth, fn);
  } finally {
    client.release();
  }
}
