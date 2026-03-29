export function maskWebhookUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const host = u.host;
    if (host.length <= 8) return `${u.protocol}//${host.slice(0, 3)}***`;
    return `${u.protocol}//${host.slice(0, 4)}…${host.slice(-3)}${path.length > 1 ? path.slice(0, 8) + "…" : ""}`;
  } catch {
    return url.length > 12 ? `${url.slice(0, 6)}…${url.slice(-4)}` : "***";
  }
}
