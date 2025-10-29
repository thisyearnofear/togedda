import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = "force-dynamic";

/**
 * GET /api/manifest
 * Serve the Farcaster manifest programmatically
 */
export async function GET(req: NextRequest) {
  try {
    // Define the path to the manifest
    const manifestPath = path.join(
      process.cwd(),
      "public",
      ".well-known",
      "farcaster.json",
    );

    // Read the manifest file
    const manifestData = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestData);

    // Get the domain from the request
    const domain = req.headers.get("host") || "togedda.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${domain}`;

    // Update URLs in the manifest to use the current domain
    if (manifest.miniApp) {
      manifest.miniApp.iconUrl = `${baseUrl}/logo.png`;
      manifest.miniApp.homeUrl = baseUrl;
      manifest.miniApp.splashImageUrl = `${baseUrl}/splash.png`;
      manifest.miniApp.webhookUrl = `${baseUrl}/api/webhook`;
      manifest.miniApp.heroImageUrl = `${baseUrl}/hero.png`;
      manifest.miniApp.ogImageUrl = `${baseUrl}/og.png`;
      manifest.miniApp.screenshotUrls = [`${baseUrl}/hero.png`];
    }

    // Legacy frame support - redirect to miniApp
    if (manifest.frame && !manifest.miniApp) {
      manifest.miniApp = manifest.frame;
      delete manifest.frame;
    }

    // Set appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET");
    headers.set("Access-Control-Allow-Headers", "Content-Type");

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error serving manifest:", error);
    return NextResponse.json(
      { error: "Failed to serve manifest" },
      { status: 500 },
    );
  }
}
