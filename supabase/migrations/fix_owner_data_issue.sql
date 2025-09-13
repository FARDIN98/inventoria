-- Fix owner data issue in dashboard
-- Check and fix missing user information for inventories

-- First, let's check the current state of data
SELECT 
  'Current inventories with owner info' as check_type,
  i.id,
  i.title,
  i."ownerId",
  u.name,
  u.email
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
ORDER BY i."createdAt" DESC;

-- Check for inventories with missing owner data
SELECT 
  'Inventories with missing owner' as issue_type,
  COUNT(*) as count
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
WHERE u.id IS NULL;

-- Check for users without names
SELECT 
  'Users without names' as issue_type,
  id,
  email,
  name
FROM users
WHERE name IS NULL OR name = '';

-- Update users table to set name from email if name is missing
UPDATE users 
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL OR name = '';

-- Verify the fix
SELECT 
  'After fix - inventories with owner info' as check_type,
  i.id,
  i.title,
  i."ownerId",
  u.name,
  u.email
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
ORDER BY i."createdAt" DESC;

-- Check if there are still any issues
SELECT 
  'Remaining issues' as final_check,
  COUNT(*) as inventories_without_owner
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
WHERE u.id IS NULL OR u.name IS NULL OR u.name = '';