import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/streaks-service-pg";

// Mark this route as dynamic to avoid static optimization errors
export const dynamic = 'force-dynamic';

/**
 * POST /api/migrate-db
 * Migrate database schema to add missing columns
 */
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  
  try {
    console.log('[migrate-db] Starting database migration...');
    
    // Check if columns exist
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_streaks' 
      AND column_name IN ('total_pushups', 'total_squats', 'last_fitness_sync', 'wallet_addresses')
    `);
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('[migrate-db] Existing columns:', existingColumns);
    
    const migrations = [];
    
    // Add total_pushups column if missing
    if (!existingColumns.includes('total_pushups')) {
      await client.query(`
        ALTER TABLE user_streaks 
        ADD COLUMN total_pushups INTEGER NOT NULL DEFAULT 0
      `);
      migrations.push('Added total_pushups column');
      console.log('[migrate-db] Added total_pushups column');
    }
    
    // Add total_squats column if missing
    if (!existingColumns.includes('total_squats')) {
      await client.query(`
        ALTER TABLE user_streaks 
        ADD COLUMN total_squats INTEGER NOT NULL DEFAULT 0
      `);
      migrations.push('Added total_squats column');
      console.log('[migrate-db] Added total_squats column');
    }
    
    // Add last_fitness_sync column if missing
    if (!existingColumns.includes('last_fitness_sync')) {
      await client.query(`
        ALTER TABLE user_streaks 
        ADD COLUMN last_fitness_sync TEXT
      `);
      migrations.push('Added last_fitness_sync column');
      console.log('[migrate-db] Added last_fitness_sync column');
    }
    
    // Add wallet_addresses column if missing
    if (!existingColumns.includes('wallet_addresses')) {
      await client.query(`
        ALTER TABLE user_streaks 
        ADD COLUMN wallet_addresses JSONB NOT NULL DEFAULT '[]'
      `);
      migrations.push('Added wallet_addresses column');
      console.log('[migrate-db] Added wallet_addresses column');
    }
    
    // Verify final schema
    const finalSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_streaks'
      ORDER BY ordinal_position
    `);
    
    console.log('[migrate-db] Migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      migrations,
      finalSchema: finalSchema.rows
    });
    
  } catch (error) {
    console.error('[migrate-db] Migration failed:', error);
    return NextResponse.json(
      { 
        error: "Migration failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/migrate-db
 * Check current database schema
 */
export async function GET(req: NextRequest) {
  const client = await pool.connect();
  
  try {
    // Get current schema
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_streaks'
      ORDER BY ordinal_position
    `);
    
    // Get sample data
    const sampleData = await client.query(`
      SELECT * FROM user_streaks LIMIT 3
    `);
    
    return NextResponse.json({
      success: true,
      schema: schema.rows,
      sampleData: sampleData.rows,
      rowCount: sampleData.rowCount
    });
    
  } catch (error) {
    console.error('[migrate-db] Schema check failed:', error);
    return NextResponse.json(
      { 
        error: "Schema check failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
