import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { db } from "../db";
import { pages, pingLogs } from "../db/schema";
import { eq } from "drizzle-orm";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6381", {
  maxRetriesPerRequest: null,
});

export const pingQueue = new Queue("pingQueue", { connection });

const worker = new Worker("pingQueue", async (job) => {
  const { pageId, url } = job.data;
  
  const startTime = Date.now();
  let status = 0;
  let isSuccess = false;
  let errorMessage = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    status = response.status;
    isSuccess = response.ok;
  } catch (error: any) {
    errorMessage = error.message || "Failed to fetch";
  }

  const responseTime = Date.now() - startTime;

  await db.insert(pingLogs).values({
    pageId,
    status,
    responseTime,
    isSuccess,
    errorMessage,
  });

  console.log(`Pinged ${url} - Status: ${status} - Time: ${responseTime}ms`);
}, { connection });

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

// Scheduler: run every minute to check what needs to be pinged
setInterval(async () => {
  try {
    const allPages = await db.query.pages.findMany({
      where: eq(pages.isActive, true),
    });

    const now = new Date();
    const minutes = now.getMinutes();

    for (const page of allPages) {
      if (minutes % page.interval === 0) {
        await pingQueue.add("ping", { pageId: page.id, url: page.url });
      }
    }
  } catch (error) {
    console.error("Scheduler error:", error);
  }
}, 60000);

console.log("Worker started...");
