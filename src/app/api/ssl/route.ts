import { NextResponse } from "next/server";
import tls from "tls";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let domain = searchParams.get("domain");

  if (!domain) {
    return new NextResponse("Domain is required", { status: 400 });
  }

  // Clean up URL
  try {
    const urlString = domain.startsWith("http") ? domain : `https://${domain}`;
    const url = new URL(urlString);
    domain = url.hostname;
  } catch (e) {
    // Fallback
  }

  try {
    const certInfo = await new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: domain as string,
        port: 443,
        servername: domain as string,
        rejectUnauthorized: false, // We want to fetch it even if it's invalid to show the error
      }, () => {
        const cert = socket.getPeerCertificate();
        if (!cert || Object.keys(cert).length === 0) {
          reject(new Error("No certificate found"));
          return;
        }

        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        resolve({
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          daysRemaining,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber,
          isValid: socket.authorized,
          authorizationError: socket.authorizationError
        });

        socket.end();
      });

      socket.on("error", (err) => {
        reject(err);
      });

      // Timeout after 5 seconds
      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error("Connection timeout"));
      });
    });

    return NextResponse.json({ result: certInfo });
  } catch (error: any) {
    console.error("SSL_ERROR", error);
    return new NextResponse(error.message || "Failed to fetch SSL info", { status: 500 });
  }
}
