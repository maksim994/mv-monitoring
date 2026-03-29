import tls from "tls";

export const PAGE_CHECK_TYPES = ["http", "keyword", "ssl_expiry"] as const;
export type PageCheckType = (typeof PAGE_CHECK_TYPES)[number];

export type PageCheckConfig = {
  keyword?: string;
  caseSensitive?: boolean;
  /** Для ssl_expiry: успех, если до истечения сертификата не меньше N дней */
  warnDays?: number;
};

const DEFAULT_SSL_WARN_DAYS = 14;
const FETCH_TIMEOUT_MS = 15_000;
const KEYWORD_BODY_MAX_BYTES = 2 * 1024 * 1024;

function normalizeHostnameFromUrl(urlString: string): string {
  const u = urlString.startsWith("http") ? urlString : `https://${urlString}`;
  return new URL(u).hostname;
}

export async function runPageCheck(input: {
  url: string;
  checkType: string | null | undefined;
  checkConfig: unknown;
}): Promise<{
  status: number;
  responseTime: number;
  isSuccess: boolean;
  errorMessage: string | null;
}> {
  const type = (input.checkType || "http") as PageCheckType;
  const cfg = (input.checkConfig && typeof input.checkConfig === "object" && !Array.isArray(input.checkConfig)
    ? (input.checkConfig as PageCheckConfig)
    : {}) as PageCheckConfig;

  if (type === "ssl_expiry") {
    return runSslExpiryCheck(input.url, cfg);
  }
  if (type === "keyword") {
    return runKeywordCheck(input.url, cfg);
  }
  return runHttpCheck(input.url);
}

async function runHttpCheck(url: string): Promise<{
  status: number;
  responseTime: number;
  isSuccess: boolean;
  errorMessage: string | null;
}> {
  const start = Date.now();
  let status = 0;
  let isSuccess = false;
  let errorMessage: string | null = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    status = response.status;
    isSuccess = response.ok;
  } catch (error: unknown) {
    errorMessage = error instanceof Error ? error.message : "Failed to fetch";
  }
  return { status, responseTime: Date.now() - start, isSuccess, errorMessage };
}

async function runKeywordCheck(
  url: string,
  cfg: PageCheckConfig
): Promise<{
  status: number;
  responseTime: number;
  isSuccess: boolean;
  errorMessage: string | null;
}> {
  const keyword = typeof cfg.keyword === "string" ? cfg.keyword.trim() : "";
  if (!keyword) {
    return {
      status: 0,
      responseTime: 0,
      isSuccess: false,
      errorMessage: "Keyword is not configured",
    };
  }

  const start = Date.now();
  let status = 0;
  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    status = response.status;
    if (!response.ok) {
      return {
        status,
        responseTime: Date.now() - start,
        isSuccess: false,
        errorMessage: `HTTP ${status}`,
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return {
        status,
        responseTime: Date.now() - start,
        isSuccess: false,
        errorMessage: "No response body",
      };
    }

    const decoder = new TextDecoder();
    let received = 0;
    let text = "";
    while (received < KEYWORD_BODY_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        text += decoder.decode(value, { stream: true });
        const hay = cfg.caseSensitive ? text : text.toLowerCase();
        const needle = cfg.caseSensitive ? keyword : keyword.toLowerCase();
        if (hay.includes(needle)) {
          isSuccess = true;
          reader.cancel().catch(() => {});
          break;
        }
      }
    }

    if (!isSuccess && received >= KEYWORD_BODY_MAX_BYTES) {
      errorMessage = "Keyword not found in first 2MB of body";
    } else if (!isSuccess) {
      errorMessage = "Keyword not found in response body";
    }
  } catch (error: unknown) {
    errorMessage = error instanceof Error ? error.message : "Failed to fetch";
  }

  return { status, responseTime: Date.now() - start, isSuccess, errorMessage };
}

function runSslExpiryCheck(
  url: string,
  cfg: PageCheckConfig
): Promise<{
  status: number;
  responseTime: number;
  isSuccess: boolean;
  errorMessage: string | null;
}> {
  const warnDays =
    typeof cfg.warnDays === "number" && Number.isFinite(cfg.warnDays) && cfg.warnDays >= 0
      ? Math.floor(cfg.warnDays)
      : DEFAULT_SSL_WARN_DAYS;

  const host = normalizeHostnameFromUrl(url);
  const start = Date.now();

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host,
        port: 443,
        servername: host,
        rejectUnauthorized: false,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          socket.end();
          const validTo = cert?.valid_to ? new Date(cert.valid_to as string) : null;
          if (!validTo || Number.isNaN(validTo.getTime())) {
            resolve({
              status: 0,
              responseTime: Date.now() - start,
              isSuccess: false,
              errorMessage: "No certificate expiry",
            });
            return;
          }
          const daysRemaining = Math.floor(
            (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const isSuccess = daysRemaining >= warnDays;
          resolve({
            status: daysRemaining,
            responseTime: Date.now() - start,
            isSuccess,
            errorMessage: isSuccess
              ? null
              : `SSL expires in ${daysRemaining} day(s), threshold ${warnDays}`,
          });
        } catch (e) {
          socket.destroy();
          resolve({
            status: 0,
            responseTime: Date.now() - start,
            isSuccess: false,
            errorMessage: e instanceof Error ? e.message : "SSL check failed",
          });
        }
      }
    );

    socket.on("error", (err) => {
      resolve({
        status: 0,
        responseTime: Date.now() - start,
        isSuccess: false,
        errorMessage: err.message || "TLS connection failed",
      });
    });

    socket.setTimeout(10_000, () => {
      socket.destroy();
      resolve({
        status: 0,
        responseTime: Date.now() - start,
        isSuccess: false,
        errorMessage: "TLS connection timeout",
      });
    });
  });
}

export function parsePageCheckPayload(body: {
  checkType?: unknown;
  checkConfig?: unknown;
}): { checkType: PageCheckType; checkConfig: PageCheckConfig } | { error: string } {
  const rawType = typeof body.checkType === "string" ? body.checkType.trim() : "http";
  if (!PAGE_CHECK_TYPES.includes(rawType as PageCheckType)) {
    return { error: "Invalid checkType" };
  }
  const checkType = rawType as PageCheckType;

  let checkConfig: PageCheckConfig = {};
  if (body.checkConfig !== undefined && body.checkConfig !== null) {
    if (typeof body.checkConfig !== "object" || Array.isArray(body.checkConfig)) {
      return { error: "checkConfig must be an object" };
    }
    checkConfig = { ...(body.checkConfig as PageCheckConfig) };
  }

  if (checkType === "keyword") {
    const kw = typeof checkConfig.keyword === "string" ? checkConfig.keyword.trim() : "";
    if (!kw) {
      return { error: "Для проверки по ключевому слову укажите keyword в checkConfig" };
    }
  }

  if (checkType === "ssl_expiry") {
    if (checkConfig.warnDays !== undefined) {
      const w = checkConfig.warnDays;
      if (typeof w !== "number" || !Number.isFinite(w) || w < 0 || w > 3650) {
        return { error: "warnDays must be a number between 0 and 3650" };
      }
    }
  }

  return { checkType, checkConfig };
}
