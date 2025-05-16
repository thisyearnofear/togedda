import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/manifest-check
 * Check the Farcaster manifest and required assets
 */
export async function GET(req: NextRequest) {
  try {
    // Define the paths to check
    const manifestPath = path.join(process.cwd(), 'public', '.well-known', 'farcaster.json');
    const assetPaths = [
      path.join(process.cwd(), 'public', 'logo.png'),
      path.join(process.cwd(), 'public', 'splash.png'),
      path.join(process.cwd(), 'public', 'hero.png'),
      path.join(process.cwd(), 'public', 'og.png')
    ];
    
    // Check if manifest exists
    let manifestExists = false;
    let manifestContent = null;
    
    try {
      const manifestData = fs.readFileSync(manifestPath, 'utf8');
      manifestExists = true;
      manifestContent = JSON.parse(manifestData);
    } catch (error) {
      console.error('Error reading manifest:', error);
    }
    
    // Check if assets exist
    const assetResults = assetPaths.map(assetPath => {
      const fileName = path.basename(assetPath);
      let exists = false;
      let size = null;
      
      try {
        const stats = fs.statSync(assetPath);
        exists = true;
        size = stats.size;
      } catch (error) {
        // File doesn't exist
      }
      
      return {
        fileName,
        exists,
        size
      };
    });
    
    // Get the domain from the request
    const domain = req.headers.get('host') || 'unknown';
    
    // Check if the manifest domain matches the current domain
    let domainMatch = false;
    if (manifestContent && manifestContent.accountAssociation && manifestContent.accountAssociation.payload) {
      try {
        const payloadStr = Buffer.from(manifestContent.accountAssociation.payload, 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        domainMatch = payload.domain === domain;
      } catch (error) {
        console.error('Error parsing payload:', error);
      }
    }
    
    return NextResponse.json({
      domain,
      manifest: {
        exists: manifestExists,
        content: manifestContent,
        path: manifestPath
      },
      assets: assetResults,
      domainMatch,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL
      }
    });
  } catch (error) {
    console.error("Error checking manifest:", error);
    return NextResponse.json(
      { error: "Failed to check manifest" },
      { status: 500 }
    );
  }
}
