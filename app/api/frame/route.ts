import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const appUrl = env.NEXT_PUBLIC_URL;

    // You can process the frame action here
    // For now, we'll just redirect to the app
    return NextResponse.json({
      version: "next",
      imageUrl: `${appUrl}/og.png`,
      button: {
        title: "Launch App",
        action: {
          type: "post_redirect",
          url: appUrl
        }
      }
    });
  } catch (error) {
    console.error("Error in frame API:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
