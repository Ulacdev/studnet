import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkDatabase() {
  console.log('🔍 Checking Supabase structure...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('email, reset_token')
    .limit(1);

  if (error) {
    if (error.message.includes('column "reset_token" does not exist')) {
      console.log('❌ ERROR: The "reset_token" column is MISSING from your "profiles" table.');
      console.log('👉 FIX: Run "ALTER TABLE profiles ADD COLUMN reset_token TEXT;" in Supabase SQL Editor.');
    } else {
      console.log('❌ Supabase Error:', error.message);
    }
  } else {
    console.log('✅ Success! The "reset_token" column exists and is accessible.');
    console.log('Current Data Sample:', data);
  }
}

checkDatabase();
