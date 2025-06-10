import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Simple test endpoint - no authentication required
  const { searchParams } = new URL(req.url);
  const fid = searchParams.get("fid") || req.headers.get("x-fid");

  return NextResponse.json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    fid: fid || null,
    status: "healthy"
  });
}
