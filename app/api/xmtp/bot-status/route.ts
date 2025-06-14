import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to get XMTP bot status
 * GET /api/xmtp/bot-status
 */
export async function GET(request: NextRequest) {
  try {
    // Check if bot environment variables are configured
    const botConfigured = !!(
      process.env.BOT_PRIVATE_KEY &&
      process.env.ENCRYPTION_KEY &&
      process.env.XMTP_ENV
    );

    // Check Redis availability
    let redisStatus = 'not_configured';
    try {
      const { redis } = await import('@/lib/redis');
      if (redis) {
        await redis.ping();
        redisStatus = 'connected';
      } else {
        redisStatus = 'not_configured';
      }
    } catch (error) {
      redisStatus = 'connection_failed';
    }

    // Check database availability
    let dbStatus = 'not_configured';
    try {
      const { pool } = await import('@/lib/db');
      const result = await pool.query('SELECT 1');
      dbStatus = result ? 'connected' : 'connection_failed';
    } catch (error) {
      dbStatus = 'connection_failed';
    }

    const status = {
      online: botConfigured,
      address: process.env.PREDICTION_BOT_XMTP_ADDRESS || 'Not configured',
      environment: process.env.XMTP_ENV || 'Not configured',
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      redisStatus,
      dbStatus,
      processingMode: redisStatus === 'connected' ? 'queue_based' : 'direct_processing',
      lastUpdated: new Date().toISOString(),
      configuration: {
        botPrivateKey: !!process.env.BOT_PRIVATE_KEY,
        encryptionKey: !!process.env.ENCRYPTION_KEY,
        xmtpEnv: process.env.XMTP_ENV || 'not_set',
        openaiKey: !!process.env.OPENAI_API_KEY,
        redisUrl: !!process.env.REDIS_URL,
        redisToken: !!process.env.REDIS_TOKEN,
        databaseUrl: !!process.env.DATABASE_URL,
      }
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting bot status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get bot status',
        online: false,
        address: 'Error',
        environment: 'Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
