import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as cheerio from "cheerio";

async function fetchTitle(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MVMonitorBot/1.0)' } });
    clearTimeout(timeoutId);
    
    if (!res.ok) return new URL(url).pathname;
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    return title || new URL(url).pathname;
  } catch (e) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
}

async function discoverFromSitemap(baseUrl: string): Promise<string[]> {
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`
  ];

  let allLocs: string[] = [];

  // Recursive function to handle sitemap indexes
  async function fetchSitemap(url: string, depth = 0) {
    if (depth > 2) return; // Prevent infinite loops
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const $ = cheerio.load(text, { xmlMode: true });
        
        // Check for sitemap index
        const sitemaps = $('sitemap loc');
        if (sitemaps.length > 0) {
          const promises: Promise<void>[] = [];
          sitemaps.each((_, el) => {
            const subSitemapUrl = $(el).text().trim();
            if (subSitemapUrl) {
              promises.push(fetchSitemap(subSitemapUrl, depth + 1));
            }
          });
          await Promise.all(promises);
        } else {
          // Regular sitemap
          $('url loc').each((_, el) => {
            const pageUrl = $(el).text().trim();
            if (pageUrl) allLocs.push(pageUrl);
          });
          // Fallback if they use just <loc> without <url>
          if (allLocs.length === 0) {
            $('loc').each((_, el) => {
              const pageUrl = $(el).text().trim();
              if (pageUrl && !pageUrl.endsWith('.xml')) allLocs.push(pageUrl);
            });
          }
        }
      }
    } catch (e) {
      // Ignore errors for individual sitemaps
    }
  }

  for (const sitemapUrl of sitemapUrls) {
    await fetchSitemap(sitemapUrl);
    if (allLocs.length > 0) break; // Found pages, no need to check other default paths
  }
  
  return allLocs;
}

async function discoverFromHtml(baseUrl: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(baseUrl, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MVMonitorBot/1.0)' } });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const links: string[] = [];
    
    const baseObj = new URL(baseUrl);

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const urlObj = new URL(href, baseUrl);
        // Only keep http/https and same origin
        if ((urlObj.protocol === 'http:' || urlObj.protocol === 'https:') && urlObj.hostname === baseObj.hostname) {
          // Remove hash
          urlObj.hash = '';
          links.push(urlObj.toString());
        }
      } catch (e) {
        // Invalid URL
      }
    });

    return links;
  } catch (e) {
    return [];
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const resolvedParams = await params;
  const { searchParams } = new URL(req.url);
  let targetUrl = searchParams.get("url");
  let limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 200;

  if (!targetUrl) return new NextResponse("URL is required", { status: 400 });

  try {
    targetUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const urlObj = new URL(targetUrl);
    targetUrl = `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (e) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, session.user.id)),
  });

  if (!project) return new NextResponse("Not found", { status: 404 });

  let discoveredUrls = await discoverFromSitemap(targetUrl);
  
  const fileExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.doc', '.docx', '.zip', '.rar', '.css', '.js', '.json', '.xml'];
  
  const filterUrls = (urls: string[]) => {
    const normalizedUrls = urls.map(url => {
      try {
        const u = new URL(url);
        // Remove trailing slash for consistency, except for root
        if (u.pathname !== '/' && u.pathname.endsWith('/')) {
          u.pathname = u.pathname.slice(0, -1);
        }
        return u.toString();
      } catch {
        return url;
      }
    });

    return Array.from(new Set(normalizedUrls)).filter(url => {
      try {
        const pathname = new URL(url).pathname.toLowerCase();
        return !fileExtensions.some(ext => pathname.endsWith(ext));
      } catch {
        return false;
      }
    });
  };

  let uniqueUrls = filterUrls(discoveredUrls);

  // If sitemap was empty or only contained other sitemaps (.xml), fallback to HTML
  if (uniqueUrls.length === 0) {
    discoveredUrls = await discoverFromHtml(targetUrl);
    uniqueUrls = filterUrls(discoveredUrls);
  }

  // Limit URLs to prevent timeouts and abuse, but allow enough for most sites
  const limitedUrls = uniqueUrls.slice(0, limit);

  // Fetch titles concurrently with a limit
  const results: { url: string; title: string }[] = [];
  
  // Process in batches of 10
  for (let i = 0; i < limitedUrls.length; i += 10) {
    const batch = limitedUrls.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const title = await fetchTitle(url);
        return { url, title };
      })
    );
    results.push(...batchResults);
  }

  return NextResponse.json({ pages: results });
}
