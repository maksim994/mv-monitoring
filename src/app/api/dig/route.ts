import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let domain = searchParams.get("domain");
  const type = searchParams.get("type") || "A";

  if (!domain) {
    return new NextResponse("Domain is required", { status: 400 });
  }

  // Clean up URL if user pasted with http:// or https:// or paths
  try {
    // If it doesn't start with http, add it just for parsing
    const urlString = domain.startsWith('http') ? domain : `http://${domain}`;
    const url = new URL(urlString);
    domain = url.hostname;
  } catch (e) {
    // If parsing fails, we'll just continue with the original string
    // and let the regex validation catch invalid formats
  }

  // Basic validation to prevent command injection
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
    return new NextResponse("Invalid domain format", { status: 400 });
  }

  const validTypes = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "ANY"];
  if (!validTypes.includes(type.toUpperCase())) {
    return new NextResponse("Invalid record type", { status: 400 });
  }

  try {
    let command = `dig ${domain} ${type} +noall +answer`;
    
    // If ANY is selected, some DNS servers (like Cloudflare 1.1.1.1) block ANY queries.
    // To provide a better UX, we can run multiple specific queries and combine them.
    if (type.toUpperCase() === "ANY") {
      // Run specific queries and only output the answer sections, hiding the extra headers
      command = `dig ${domain} A +noall +answer && dig ${domain} AAAA +noall +answer && dig ${domain} MX +noall +answer && dig ${domain} TXT +noall +answer && dig ${domain} NS +noall +answer`;
    }

    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error("DIG_STDERR", stderr);
    }

    // Clean up the output to remove the dig headers and empty lines
    const cleanOutput = stdout
      .split('\n')
      .filter(line => line.trim() !== '' && !line.startsWith(';') && !line.startsWith(';;'))
      .join('\n');

    return NextResponse.json({ result: cleanOutput || "No records found" });
  } catch (error) {
    console.error("DIG_ERROR", error);
    return new NextResponse("Failed to execute dig", { status: 500 });
  }
}
