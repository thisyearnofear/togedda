import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authToken = req.cookies.get("auth_token");
  const fid = req.headers.get("x-user-fid");

  // For session validation, return status even if not authenticated
  if (!authToken) {
    return NextResponse.json({
      message: "No active session",
      timestamp: new Date().toISOString(),
      authenticated: false,
      fid: null
    });
  }

  // you can fetch user FID like this
  console.log({ fid });

  // Return successful authentication status
  return NextResponse.json({
    message: "Authentication successful!",
    timestamp: new Date().toISOString(),
    authenticated: true,
    fid: fid || null
  });
}
