import { NextResponse } from "next/server";
import { db } from "@/db";
import { planLimits } from "@/db/schema";

export async function GET() {
  try {
    await db.select().from(planLimits).limit(1);
    return NextResponse.json({ ok: true, database: true });
  } catch (e) {
    console.error("[health]", e);
    return NextResponse.json({ ok: false, database: false }, { status: 503 });
  }
}
