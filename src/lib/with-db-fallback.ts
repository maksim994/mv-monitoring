/**
 * Во время `next build` в Docker Postgres часто недоступен (ECONNREFUSED).
 * Используйте для чтений из БД на страницах, которые пререндерятся при сборке.
 */
export async function withDbFallback<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV === "development") {
      console.warn("[withDbFallback]", msg);
    }
    return fallback;
  }
}
