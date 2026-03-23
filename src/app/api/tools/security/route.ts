import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("URL is required", { status: 400 });
  }

  try {
    targetUrl = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
    const urlObj = new URL(targetUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;

    const result: any = {
      url: targetUrl,
      env: { vulnerable: false, checked: false, details: null },
      git: { vulnerable: false, checked: false, details: null },
      dirListing: { vulnerable: false, checked: false, details: null },
      cors: { vulnerable: false, checked: false, details: null }
    };

    const fetchWithTimeout = async (url: string, options: any = {}, timeout = 3000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    // 1. Check .env
    try {
      result.env.checked = true;
      const res = await fetchWithTimeout(`${baseUrl}/.env`);
      if (res.ok) {
        const text = await res.text();
        // Basic heuristic: looks like an env file if it has KEY=VALUE lines
        if (text.includes('=') && !text.includes('<html')) {
          result.env.vulnerable = true;
          result.env.details = "Файл .env доступен публично!";
        }
      }
    } catch (e) {
      // Ignore
    }

    // 2. Check .git/config
    try {
      result.git.checked = true;
      const res = await fetchWithTimeout(`${baseUrl}/.git/config`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes('[core]') || text.includes('repositoryformatversion')) {
          result.git.vulnerable = true;
          result.git.details = "Директория .git доступна публично!";
        }
      }
    } catch (e) {
      // Ignore
    }

    // 3. Directory Listing (try a common dir like /images/ or /assets/ without index)
    try {
      result.dirListing.checked = true;
      // Try to find a directory that might have listing enabled. We'll just try a random non-existent one first.
      const res = await fetchWithTimeout(`${baseUrl}/images/`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes('Index of /') || text.includes('Directory listing for')) {
          result.dirListing.vulnerable = true;
          result.dirListing.details = "Обнаружен Directory Listing (Index of /)";
        }
      }
    } catch (e) {
      // Ignore
    }

    // 4. CORS Misconfiguration
    try {
      result.cors.checked = true;
      const evilOrigin = "https://evil.com";
      const res = await fetchWithTimeout(targetUrl, {
        headers: {
          'Origin': evilOrigin
        }
      });
      
      const allowOrigin = res.headers.get('access-control-allow-origin');
      if (allowOrigin === '*' || allowOrigin === evilOrigin) {
        result.cors.vulnerable = true;
        result.cors.details = `Заголовок Access-Control-Allow-Origin установлен в '${allowOrigin}', что может быть небезопасно.`;
      }
    } catch (e) {
      // Ignore
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    return new NextResponse(error.message || "Failed to run security scan", { status: 500 });
  }
}
