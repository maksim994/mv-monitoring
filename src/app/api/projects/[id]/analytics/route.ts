import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { pages, pingLogs } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const resolvedParams = await params;
  const projectId = resolvedParams.id;

  // Get all pages for this project
  const projectPages = await db.query.pages.findMany({
    where: eq(pages.projectId, projectId),
  });

  if (projectPages.length === 0) {
    return NextResponse.json({ uptime: 0, avgPing: 0, chartData: [] });
  }

  const pageIds = projectPages.map((p) => p.id);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get all logs for these pages in the last 24 hours
  const logs = await db.query.pingLogs.findMany({
    where: and(
      inArray(pingLogs.pageId, pageIds),
      gte(pingLogs.createdAt, twentyFourHoursAgo)
    ),
    orderBy: (pingLogs, { asc }) => [asc(pingLogs.createdAt)],
  });

  if (logs.length === 0) {
    return NextResponse.json({ uptime: 100, avgPing: 0, chartData: [] });
  }

  // Calculate overall uptime
  const totalLogs = logs.length;
  const successfulLogs = logs.filter((l) => l.isSuccess).length;
  const uptime = (successfulLogs / totalLogs) * 100;

  // Calculate average ping
  const upLogs = logs.filter((l) => l.isSuccess && l.responseTime !== null);
  const avgPing = upLogs.length > 0 
    ? upLogs.reduce((acc, l) => acc + (l.responseTime || 0), 0) / upLogs.length 
    : 0;

  // Group by hour for chart
  const hourlyData: Record<string, { totalPing: number; count: number; upCount: number; total: number }> = {};

  logs.forEach((log) => {
    const date = new Date(log.createdAt);
    const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
    
    if (!hourlyData[hourKey]) {
      hourlyData[hourKey] = { totalPing: 0, count: 0, upCount: 0, total: 0 };
    }
    
    hourlyData[hourKey].total++;
    if (log.isSuccess) {
      hourlyData[hourKey].upCount++;
      if (log.responseTime) {
        hourlyData[hourKey].totalPing += log.responseTime;
        hourlyData[hourKey].count++;
      }
    }
  });

  const chartData = Object.keys(hourlyData).sort().map((time) => {
    const data = hourlyData[time];
    return {
      time,
      ping: data.count > 0 ? Math.round(data.totalPing / data.count) : 0,
      uptime: Math.round((data.upCount / data.total) * 100),
    };
  });

  return NextResponse.json({
    uptime: Number(uptime.toFixed(2)),
    avgPing: Math.round(avgPing),
    chartData,
  });
}
