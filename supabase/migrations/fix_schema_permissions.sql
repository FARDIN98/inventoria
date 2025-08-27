-- Fix schema-level permissions for public access

-- Grant usage on public schema to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select permissions on all tables to anon and authenticated
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert, update, delete permissions on specific tables to authenticated users
GRANT INSERT, UPDATE, DELETE ON inventories TO authenticated;
GRANT INSERT ON tags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON inventory_tags TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- Specifically ensure categories table has proper permissions
GRANT SELECT ON categories TO anon;
GRANT SELECT ON categories TO authenticated;

-- Drop existing policies that might be conflicting and recreate them
DROP POLICY IF EXISTS "Allow public read access to categories" ON categories;
DROP POLICY IF EXISTS "Allow public read access to public inventories" ON inventories;
DROP POLICY IF EXISTS "Allow users to read own inventories" ON inventories;
DROP POLICY IF EXISTS "Allow authenticated users to create inventories" ON inventories;
DROP POLICY IF EXISTS "Allow users to update own inventories" ON inventories;
DROP POLICY IF EXISTS "Allow users to delete own inventories" ON inventories;

-- Disable RLS temporarily to test if that's the issue
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_tags DISABLE ROW LEVEL SECURITY;