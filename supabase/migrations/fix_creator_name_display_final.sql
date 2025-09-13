-- Final fix for creator name display issue
-- This ensures users have names and proper RLS policies are in place

-- 1. First, populate any missing user names from email addresses
UPDATE users 
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL OR name = '' OR TRIM(name) = '';

-- 2. Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policy if it exists and recreate it
DROP POLICY IF EXISTS "Allow public read access to user names" ON users;

-- 4. Create policy to allow anonymous users to read basic user info
CREATE POLICY "Allow public read access to user names" ON users
  FOR SELECT
  TO anon
  USING (true);

-- 5. Grant SELECT permission on users table to anon role
GRANT SELECT ON users TO anon;

-- 6. Also ensure authenticated users can read user data
GRANT SELECT ON users TO authenticated;

-- 7. Verify the fix by checking a sample inventory with owner data
SELECT 
  i.id,
  i.title,
  i."isPublic",
  u.name as creator_name,
  u.email as creator_email,
  CASE 
    WHEN u.name IS NULL OR u.name = '' THEN 'STILL_MISSING'
    ELSE 'NAME_AVAILABLE'
  END as creator_name_status
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
WHERE i."isPublic" = true
ORDER BY i."createdAt" DESC
LIMIT 3;

-- 8. Check current RLS policies
SELECT 
    tablename, 
    policyname, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;