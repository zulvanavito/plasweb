const globalForReconciler = globalThis as unknown as {
  __plasAiReconcilerTimer?: ReturnType<typeof setInterval>;
};

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!process.env.DATABASE_URL) {
      return;
    }

    const { reconcileStaleAiUsageOnce } = await import("@/lib/ai/reconciler");

    try {
      await reconcileStaleAiUsageOnce();
    } catch {
      // Jangan gagalkan startup jika DB sedang unreachable; interval berikutnya akan mencoba lagi.
    }

    if (!globalForReconciler.__plasAiReconcilerTimer) {
      const timer = setInterval(() => {
        void reconcileStaleAiUsageOnce().catch(() => undefined);
      }, 60_000);
      timer.unref?.();
      globalForReconciler.__plasAiReconcilerTimer = timer;
    }
  }
}
