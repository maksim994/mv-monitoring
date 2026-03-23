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

  try {
    targetUrl = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;

    // Use curl to get detailed timings
    const command = `curl -sL -o /dev/null -w "%{json}" --compressed "${targetUrl}"`;
    const { stdout } = await execAsync(command, { timeout: 15000 });

    const curlData = JSON.parse(stdout);

    // Calculate timings in milliseconds
    const timings = {
      dnsLookup: Math.round(curlData.time_namelookup * 1000),
      tcpConnect: Math.round((curlData.time_connect - curlData.time_namelookup) * 1000),
      tlsHandshake: Math.round((curlData.time_appconnect - curlData.time_connect) * 1000),
      ttfb: Math.round((curlData.time_starttransfer - curlData.time_appconnect) * 1000),
      contentTransfer: Math.round((curlData.time_total - curlData.time_starttransfer) * 1000),
      total: Math.round(curlData.time_total * 1000),
    };

    // Handle cases where TLS is not used (e.g. http)
    if (timings.tlsHandshake < 0) timings.tlsHandshake = 0;
    if (timings.ttfb < 0) timings.ttfb = Math.round((curlData.time_starttransfer - curlData.time_connect) * 1000);

    const result = {
      url: curlData.url_effective,
      ip: curlData.remote_ip,
      httpVersion: curlData.http_version,
      statusCode: curlData.response_code,
      downloadSize: curlData.size_download,
      speedDownload: Math.round(curlData.speed_download), // bytes/sec
      timings
    };

    return NextResponse.json({ result });
  } catch (error: any) {
    return new NextResponse(error.message || "Failed to analyze performance", { status: 500 });
  }
}
