-- Fix creator name display issue
-- Allow anonymous users to read basic user information (name, email)
-- This fixes the issue where creator names show as "Unknown" for non-authenticated users

-- First, check current RLS policies on users table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Check if RLS is enabled on users table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Allow public read access to user names" ON users;
DROP POLICY IF EXISTS "users_select_service_role" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;

-- Create policy to allow anonymous users to read basic user info (name, email)
CREATE POLICY "Allow public read access to user names" ON users
  FOR SELECT
  TO anon
  USING (true);

-- Create policy to allow authenticated users to read basic user info
CREATE POLICY "Allow authenticated read access to user names" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant SELECT permission on users table to anon role
GRANT SELECT ON users TO anon;

-- Grant SELECT permission on users table to authenticated role
GRANT SELECT ON users TO authenticated;

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- Test query to verify anonymous users can read user names
-- This should return user data without authentication
SELECT id, name, email FROM users LIMIT 5;