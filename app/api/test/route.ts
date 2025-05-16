import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authToken = req.cookies.get("auth_token");

  if (!authToken) {
    return NextResponse.json(
      { error: "Unauthorized - No auth token" },
      { status: 401 }
    );
  }

  // you can fetch user FID like this
  console.log({ fid: req.headers.get("x-user-fid") });

  // In a real app, you'd validate the token here
  return NextResponse.json({
    message: "Authentication successful!",
    timestamp: new Date().toISOString(),
  });
}
