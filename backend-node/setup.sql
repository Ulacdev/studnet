-- Run this in your Supabase SQL Editor
-- Go to: SQL Editor → New Query → Paste this → Click "Run"

-- 1. Remove the old foreign key constraint that links to auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Add password column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- 3. Make sure email is unique
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- 4. Drop the old trigger (we don't need it anymore)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. Housing Units table
CREATE TABLE IF NOT EXISTS housing_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat FLOAT8 NOT NULL,
  lon FLOAT8 NOT NULL,
  price NUMERIC,
  rating FLOAT4 DEFAULT 4.5,
  phone TEXT,
  category TEXT,
  description TEXT,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable Row Level Security but allow all operations
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on housing_units" ON housing_units;
CREATE POLICY "Allow all on housing_units" ON housing_units FOR ALL USING (true) WITH CHECK (true);

-- 8. Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

-- 10. Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on audit_logs" ON audit_logs;
CREATE POLICY "Allow all on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on favorites" ON favorites;
CREATE POLICY "Allow all on favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);

-- 11. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 12. Insert default Admin account
INSERT INTO profiles (id, full_name, email, password, role, updated_at)
VALUES (gen_random_uuid(), 'System Admin', 'admin@dormpulse.com', 'admin', 'Admin', NOW())
ON CONFLICT (email) DO NOTHING;

-- 13. Add missing columns to housing_units if they don't exist
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS rating FLOAT4 DEFAULT 4.5;
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE housing_units ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
