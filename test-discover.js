const cheerio = require('cheerio');

async function testSitemap(baseUrl) {
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`
  ];

  let allLocs = [];

  async function fetchSitemap(url, depth = 0) {
    if (depth > 2) return;
    
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        const $ = cheerio.load(text, { xmlMode: true });
        
        const sitemaps = $('sitemap loc');
        if (sitemaps.length > 0) {
          console.log(`Found sitemap index with ${sitemaps.length} sub-sitemaps`);
          const promises = [];
          sitemaps.each((_, el) => {
            const subSitemapUrl = $(el).text().trim();
            if (subSitemapUrl) {
              promises.push(fetchSitemap(subSitemapUrl, depth + 1));
            }
          });
          await Promise.all(promises);
        } else {
          $('url loc').each((_, el) => {
            const pageUrl = $(el).text().trim();
            if (pageUrl) allLocs.push(pageUrl);
          });
          if (allLocs.length === 0) {
            $('loc').each((_, el) => {
              const pageUrl = $(el).text().trim();
              if (pageUrl && !pageUrl.endsWith('.xml')) allLocs.push(pageUrl);
            });
          }
        }
      }
    } catch (e) {
      console.error("Error fetching", url, e);
    }
  }

  for (const sitemapUrl of sitemapUrls) {
    await fetchSitemap(sitemapUrl);
    if (allLocs.length > 0) break;
  }
  
  console.log("Total locs from recursive sitemap:", allLocs.length);
  return allLocs;
}

testSitemap('https://mvmolkov.ru');
