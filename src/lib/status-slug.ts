/** Публичный slug для /status/[slug]: 3–64 символа, a-z, 0-9, дефисы. */

export function parseStatusSlug(raw: unknown): { slug: string | null; error?: string } {
  if (raw === null || raw === undefined) {
    return { slug: null };
  }
  if (typeof raw !== "string") {
    return { slug: null, error: "statusSlug должен быть строкой" };
  }
  const t = raw.trim().toLowerCase();
  if (t.length === 0) {
    return { slug: null };
  }
  if (t.length < 3 || t.length > 64) {
    return { slug: null, error: "Адрес: от 3 до 64 символов" };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t)) {
    return { slug: null, error: "Только латиница, цифры и дефисы" };
  }
  return { slug: t };
}
