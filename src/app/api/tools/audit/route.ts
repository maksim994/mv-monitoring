import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

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
      robots: { found: false, content: null, hasSitemap: false },
      sitemap: { found: false, url: null },
      meta: {
        title: null,
        description: null,
        canonical: null,
        viewport: null,
        ogTitle: null,
        ogImage: null,
        h1Count: 0
      }
    };

    // 1. Check robots.txt
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const robotsRes = await fetch(`${baseUrl}/robots.txt`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (robotsRes.ok) {
        const text = await robotsRes.text();
        result.robots.found = true;
        result.robots.content = text.length > 500 ? text.substring(0, 500) + '...' : text;
        
        // Check for sitemap in robots
        const sitemapMatch = text.match(/Sitemap:\s*(https?:\/\/[^\s]+)/i);
        if (sitemapMatch) {
          result.robots.hasSitemap = true;
          result.sitemap.found = true;
          result.sitemap.url = sitemapMatch[1];
        }
      }
    } catch (e) {
      // Ignore
    }

    // 2. Check default sitemap if not found in robots
    if (!result.sitemap.found) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (sitemapRes.ok) {
          result.sitemap.found = true;
          result.sitemap.url = `${baseUrl}/sitemap.xml`;
        }
      } catch (e) {
        // Ignore
      }
    }

    // 3. Check Meta tags
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const htmlRes = await fetch(targetUrl, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MVMonitorBot/1.0)' }
      });
      clearTimeout(timeoutId);

      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const $ = cheerio.load(html);

        result.meta.title = $('title').text().trim() || null;
        result.meta.description = $('meta[name="description"]').attr('content') || null;
        result.meta.canonical = $('link[rel="canonical"]').attr('href') || null;
        result.meta.viewport = $('meta[name="viewport"]').attr('content') || null;
        result.meta.ogTitle = $('meta[property="og:title"]').attr('content') || null;
        result.meta.ogImage = $('meta[property="og:image"]').attr('content') || null;
        result.meta.h1Count = $('h1').length;
      }
    } catch (e) {
      // Ignore
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    return new NextResponse(error.message || "Failed to audit website", { status: 500 });
  }
}
