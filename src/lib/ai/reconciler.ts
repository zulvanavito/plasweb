import { getPool } from "@/lib/db/pool";

export async function reconcileStaleAiUsageOnce(
  staleMinutes = Number(process.env.AI_PENDING_TIMEOUT_MINUTES ?? 5)
): Promise<number> {
  if (!process.env.DATABASE_URL) {
    return 0;
  }

  const safeMinutes =
    Number.isFinite(staleMinutes) && staleMinutes >= 1
      ? Math.floor(staleMinutes)
      : 5;

  const res = await getPool().query<{ reconciled: number }>(
    `SELECT public.fn_reconcile_stale_ai_usage($1) AS reconciled`,
    [safeMinutes]
  );
  return Number(res.rows[0]?.reconciled ?? 0);
}
