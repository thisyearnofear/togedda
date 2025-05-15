import { getFarcasterManifest } from "@/lib/warpcast";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const manifest = await getFarcasterManifest();
    
    // Set CORS headers
    const response = NextResponse.json(manifest);
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    
    return response;
  } catch (error) {
    console.error("Error generating manifest:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
