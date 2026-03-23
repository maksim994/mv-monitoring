import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("URL is required", { status: 400 });
  }

  // Clean up URL
  try {
    targetUrl = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
    new URL(targetUrl); // Validate
  } catch (e) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    // curl command to get headers (-D -), follow redirects (-L), silent (-s), output to null (-o /dev/null),
    // and write JSON format with timings and info (-w "%{json}")
    // We use --compressed to request gzip/brotli
    const command = `curl -sL -D - -o /dev/null -w "%{json}" --compressed "${targetUrl}"`;
    
    const { stdout, stderr } = await execAsync(command, { timeout: 15000 });
    
    // The output contains HTTP headers followed by the JSON object
    // We need to split them
    // The JSON object is always at the very end and starts with '{'
    const lastBraceIndex = stdout.lastIndexOf('{');
    
    if (lastBraceIndex === -1) {
      throw new Error("Failed to parse curl output");
    }

    const headersRaw = stdout.substring(0, lastBraceIndex).trim();
    const jsonRaw = stdout.substring(lastBraceIndex).trim();
    
    const curlData = JSON.parse(jsonRaw);

    // Parse headers and redirect chain
    // curl outputs headers for each redirect separated by blank lines
    const blocks = headersRaw.split(/\r?\n\r?\n/).filter(b => b.trim().length > 0);
    
    const redirects = blocks.map(block => {
      const lines = block.split(/\r?\n/);
      const statusLine = lines[0];
      const headers: Record<string, string> = {};
      
      // Parse status line: HTTP/2 200 OK
      const statusMatch = statusLine.match(/^HTTP\/[\d.]+ (\d+) (.*)$/i) || statusLine.match(/^HTTP\/[\d.]+ (\d+)$/i);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0;
      const statusText = statusMatch && statusMatch[2] ? statusMatch[2] : "";

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.substring(0, colonIdx).trim().toLowerCase();
          const value = line.substring(colonIdx + 1).trim();
          headers[key] = value;
        }
      }

      return {
        statusLine,
        statusCode,
        statusText,
        headers
      };
    });

    const finalResponse = redirects[redirects.length - 1];

    // Format timings (convert seconds to ms)
    const timings = {
      dnsLookup: Math.round(curlData.time_namelookup * 1000),
      tcpConnect: Math.round((curlData.time_connect - curlData.time_namelookup) * 1000),
      tlsHandshake: Math.round((curlData.time_appconnect - curlData.time_connect) * 1000),
      ttfb: Math.round((curlData.time_starttransfer - curlData.time_appconnect) * 1000),
      contentTransfer: Math.round((curlData.time_total - curlData.time_starttransfer) * 1000),
      total: Math.round(curlData.time_total * 1000),
      redirects: Math.round(curlData.time_redirect * 1000),
    };

    // Fix negative values if TLS is not used
    if (timings.tlsHandshake < 0) timings.tlsHandshake = 0;

    const result = {
      url: curlData.url_effective,
      ip: curlData.remote_ip,
      port: curlData.remote_port,
      httpVersion: curlData.http_version,
      scheme: curlData.scheme,
      statusCode: curlData.response_code,
      contentType: curlData.content_type,
      redirects,
      timings,
      finalHeaders: finalResponse?.headers || {},
      compression: finalResponse?.headers['content-encoding'] || 'none'
    };

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("HTTP_INSPECTOR_ERROR", error);
    return new NextResponse(error.message || "Failed to inspect URL", { status: 500 });
  }
}
