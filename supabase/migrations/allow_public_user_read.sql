-- Allow anonymous users to read basic user information (name, email)
-- This fixes the issue where creator names show as "Unknown" for non-authenticated users

-- Create policy to allow anonymous users to read basic user info
CREATE POLICY "Allow public read access to user names" ON users
  FOR SELECT
  TO anon
  USING (true);

-- Grant SELECT permission on users table to anon role
GRANT SELECT ON users TO anon;

-- Verify the policy is created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' AND policyname = 'Allow public read access to user names';