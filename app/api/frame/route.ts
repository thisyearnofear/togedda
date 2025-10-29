import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const appUrl = env.NEXT_PUBLIC_URL;

    // You can process the frame action here
    // For now, we'll just redirect to the app
    return NextResponse.json({
      version: "next",
      imageUrl: `${appUrl}/og.png`,
      button: {
        title: "Stay Hard",
        action: {
          type: "post_redirect",
          url: appUrl,
        },
      },
    });
  } catch (error) {
    console.error("Error in frame API:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
