import * as cheerio from "cheerio";
import { randomBytes } from "crypto";

const UA = "Mozilla/5.0 (compatible; MVMonitorBot/1.0)";
const FETCH_TIMEOUT_MS = 8000;

export function generateDomainVerificationToken(): string {
  return randomBytes(24).toString("base64url");
}

function hostsToProbe(hostname: string): string[] {
  const h = hostname.toLowerCase();
  const list = [h];
  if (!h.startsWith("www.")) {
    list.push(`www.${h}`);
  }
  return list;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function verifyViaWellKnown(hostname: string, token: string): Promise<boolean> {
  for (const host of hostsToProbe(hostname)) {
    const text = await fetchText(`https://${host}/.well-known/mv-monitor-verification.txt`);
    if (text !== null && text.trim() === token) return true;
  }
  return false;
}

async function verifyViaMeta(hostname: string, token: string): Promise<boolean> {
  for (const host of hostsToProbe(hostname)) {
    const html = await fetchText(`https://${host}/`);
    if (!html) continue;
    const $ = cheerio.load(html);
    const content = $('meta[name="mv-monitor-verification"]').attr("content")?.trim() ?? null;
    if (content === token) return true;
  }
  return false;
}

/** Returns true if token is found in .well-known file or in homepage meta tag. */
export async function verifyDomainOwnership(hostname: string, token: string): Promise<boolean> {
  if (!hostname?.trim() || !token?.trim()) return false;
  if (await verifyViaWellKnown(hostname, token)) return true;
  if (await verifyViaMeta(hostname, token)) return true;
  return false;
}
