-- Fix RLS policies and permissions for users table
-- This addresses the "Failed to create user record" error

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to read own profile" ON users;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to create user records" ON users;

-- Create policy to allow users to read their own profile
CREATE POLICY "Allow users to read own profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

-- Create policy to allow authenticated users to create user records
-- This is needed for the createInventoryAction function
CREATE POLICY "Allow authenticated users to create user records" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';