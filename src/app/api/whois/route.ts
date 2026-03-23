import { NextResponse } from "next/server";
import * as whois from "whois";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let domain = searchParams.get("domain");

  if (!domain) {
    return new NextResponse("Domain is required", { status: 400 });
  }

  // Convert to punycode for IDN domains (like .рф) and clean up URL
  try {
    const urlString = domain.startsWith('http') ? domain : `http://${domain}`;
    const url = new URL(urlString);
    domain = url.hostname;
  } catch (e) {
    // Fallback if URL parsing fails
  }

  try {
    const data = await new Promise((resolve, reject) => {
      whois.lookup(domain as string, (err: any, data: string) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error("WHOIS_ERROR", error);
    return new NextResponse("Failed to execute whois", { status: 500 });
  }
}
