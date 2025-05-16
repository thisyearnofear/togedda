import { NextRequest, NextResponse } from "next/server";
import pool from '@/lib/db';

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * GET /api/db-test
 * Test the database connection
 */
export async function GET(req: NextRequest) {
  try {
    // Test the database connection
    const client = await pool.connect();
    
    try {
      // Run a simple query
      const result = await client.query('SELECT NOW() as time');
      
      return NextResponse.json({
        success: true,
        message: "Database connection successful",
        time: result.rows[0].time,
        database: {
          host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
          database: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'unknown'
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { 
        error: "Database connection failed", 
        details: error instanceof Error ? error.message : String(error),
        databaseUrl: process.env.DATABASE_URL ? 
          `${process.env.DATABASE_URL.substring(0, 20)}...` : 
          'Not configured'
      },
      { status: 500 }
    );
  }
}
