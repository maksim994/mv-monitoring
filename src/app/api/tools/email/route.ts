import { NextResponse } from "next/server";
import dns from "dns";
import net from "net";
import { promisify } from "util";

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

async function checkPort(host: string, port: number, timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  const selector = searchParams.get("selector");

  if (!domain) {
    return new NextResponse("Domain is required", { status: 400 });
  }

  // Clean domain
  let cleanDomain = domain.trim().toLowerCase();
  try {
    if (cleanDomain.startsWith('http')) {
      cleanDomain = new URL(cleanDomain).hostname;
    }
  } catch (e) {
    // Ignore
  }

  const result: any = {
    domain: cleanDomain,
    spf: { found: false, record: null, valid: false },
    dmarc: { found: false, record: null, parsed: {} },
    dkim: { found: false, record: null, checked: false },
    mx: { found: false, records: [], smtpPorts: { 25: false, 587: false } }
  };

  try {
    // 1. Check SPF
    try {
      const txtRecords = await resolveTxt(cleanDomain);
      const spfRecord = txtRecords.find(r => r.join('').startsWith('v=spf1'));
      if (spfRecord) {
        const recordStr = spfRecord.join('');
        result.spf.found = true;
        result.spf.record = recordStr;
        // Basic validation: ends with ~all, -all, ?all, +all
        result.spf.valid = /[-~?+]all$/.test(recordStr);
      }
    } catch (e) {
      // No TXT records or DNS error
    }

    // 2. Check DMARC
    try {
      const dmarcDomain = `_dmarc.${cleanDomain}`;
      const txtRecords = await resolveTxt(dmarcDomain);
      const dmarcRecord = txtRecords.find(r => r.join('').startsWith('v=DMARC1'));
      if (dmarcRecord) {
        const recordStr = dmarcRecord.join('');
        result.dmarc.found = true;
        result.dmarc.record = recordStr;
        
        // Parse basic tags
        const tags = recordStr.split(';').map(t => t.trim()).filter(t => t);
        tags.forEach(tag => {
          const [key, val] = tag.split('=');
          if (key && val) {
            result.dmarc.parsed[key.trim()] = val.trim();
          }
        });
      }
    } catch (e) {
      // No DMARC record
    }

    // 3. Check DKIM (if selector provided)
    if (selector) {
      result.dkim.checked = true;
      try {
        const dkimDomain = `${selector}._domainkey.${cleanDomain}`;
        const txtRecords = await resolveTxt(dkimDomain);
        const dkimRecord = txtRecords.find(r => r.join('').startsWith('v=DKIM1'));
        if (dkimRecord) {
          result.dkim.found = true;
          result.dkim.record = dkimRecord.join('');
        }
      } catch (e) {
        // No DKIM record for this selector
      }
    }

    // 4. Check MX and SMTP
    try {
      const mxRecords = await resolveMx(cleanDomain);
      if (mxRecords && mxRecords.length > 0) {
        // Sort by priority
        mxRecords.sort((a, b) => a.priority - b.priority);
        result.mx.found = true;
        result.mx.records = mxRecords;

        // Test SMTP ports on the primary MX
        const primaryMx = mxRecords[0].exchange;
        const port25 = await checkPort(primaryMx, 25);
        const port587 = await checkPort(primaryMx, 587);
        
        result.mx.smtpPorts = {
          25: port25,
          587: port587
        };
      }
    } catch (e) {
      // No MX records
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    return new NextResponse(error.message || "Failed to inspect email records", { status: 500 });
  }
}
