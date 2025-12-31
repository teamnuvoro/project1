/**
 * Create chat_images table in Supabase
 * Run this to set up the table for storing chat images
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://xgraxcgavqeyqfwimbwt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  console.log('📋 Creating chat_images table...\n');

  // Read the migration SQL
  const migrationPath = join(process.cwd(), 'supabase/migrations/20250113_chat_images.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length < 10) continue; // Skip very short statements

    try {
      // Use Supabase REST API to execute SQL
      const { data, error } = await supabase.rpc('exec_sql', { 
        query: statement 
      });

      if (error) {
        // Try alternative: direct REST call
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          console.log(`⚠️  Statement ${i + 1} may have failed (this is OK if table already exists)`);
        }
      }
    } catch (err: any) {
      // Ignore errors - table might already exist
      console.log(`⚠️  Statement ${i + 1}: ${err.message.substring(0, 50)}...`);
    }
  }

  // Try to verify table exists by querying it
  console.log('\n🔍 Verifying table exists...');
  const { data, error } = await supabase
    .from('chat_images')
    .select('id')
    .limit(1);

  if (error && error.code === 'PGRST205') {
    console.log('\n❌ Table still not found. Creating via direct SQL...');
    
    // Create table using direct SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS chat_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        image_url TEXT NOT NULL,
        caption TEXT,
        category VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chat_images_active 
      ON chat_images(is_active) 
      WHERE is_active = true;

      CREATE INDEX IF NOT EXISTS idx_chat_images_category 
      ON chat_images(category, is_active);
    `;

    // Use Supabase PostgREST to execute - we'll use a workaround
    console.log('💡 Please run this SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    console.log(createTableSQL);
    console.log('='.repeat(60) + '\n');
    
    console.log('Or visit: https://supabase.com/dashboard/project/xgraxcgavqeyqfwimbwt/sql/new');
    console.log('And paste the SQL above.\n');
  } else if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Table exists and is accessible!');
  }
}

createTable().catch(console.error);

