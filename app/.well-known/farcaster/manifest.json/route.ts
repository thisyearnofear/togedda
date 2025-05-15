import { env } from "@/lib/env";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const appUrl = env.NEXT_PUBLIC_URL;
    
    return NextResponse.json({
      name: "Imperfect Form",
      description: "Track fitness goals across multiple blockchain networks with a retro-gamified style.",
      icon_url: `${appUrl}/logo.png`,
      image: `${appUrl}/og.png`,
      app_url: appUrl,
      categories: ["health-fitness"],
      tags: ["fitness", "blockchain", "gamification", "prediction-market"],
      tagline: "Fitness goals on-chain",
      theme_color: "#000000",
      publisher_name: "Imperfect Form",
      publisher_icon_url: `${appUrl}/logo.png`,
      screenshots: [
        `${appUrl}/hero.png`
      ]
    });
  } catch (error) {
    console.error("Error generating manifest:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
