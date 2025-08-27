-- Create initial admin user script
-- This script should be run after a user has been created through Supabase Auth
-- Replace 'your-admin-email@example.com' with the actual admin email

-- Step 1: First create the user through Supabase Auth dashboard or signup process
-- Step 2: Then run this script to promote them to admin

-- Update existing user to admin role (replace email with actual admin email)
UPDATE users 
SET 
  role = 'ADMIN',
  isBlocked = false,
  updatedAt = NOW()
WHERE email = 'your-admin-email@example.com';

-- Verify the admin user was created
SELECT id, email, name, role, isBlocked, createdAt 
FROM users 
WHERE role = 'ADMIN';

-- Alternative: If you need to create a user record manually (not recommended)
-- This should only be used if the user exists in Supabase Auth but not in the users table
/*
INSERT INTO users (
  id,
  email,
  name,
  role,
  isBlocked,
  language,
  theme,
  createdAt,
  updatedAt
) VALUES (
  'your-supabase-auth-user-id', -- Get this from Supabase Auth dashboard
  'your-admin-email@example.com',
  'Admin User',
  'ADMIN',
  false,
  'en',
  'light',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'ADMIN',
  isBlocked = false,
  updatedAt = NOW();
*/

-- Grant necessary permissions (if using RLS)
-- These might be needed depending on your RLS setup
/*
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON inventories TO authenticated;
GRANT ALL PRIVILEGES ON items TO authenticated;
GRANT ALL PRIVILEGES ON categories TO authenticated;
GRANT ALL PRIVILEGES ON tags TO authenticated;
GRANT ALL PRIVILEGES ON inventory_tags TO authenticated;
GRANT ALL PRIVILEGES ON access TO authenticated;
GRANT ALL PRIVILEGES ON field_templates TO authenticated;
GRANT ALL PRIVILEGES ON discussion_posts TO authenticated;
GRANT ALL PRIVILEGES ON likes TO authenticated;
*/