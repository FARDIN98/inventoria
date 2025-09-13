-- Check all users data to identify missing names
-- This will help us understand which users need name population

SELECT 
  id,
  email,
  name,
  CASE 
    WHEN name IS NULL OR name = '' THEN 'MISSING_NAME'
    ELSE 'HAS_NAME'
  END as name_status,
  "createdAt"
FROM users 
ORDER BY "createdAt" DESC;

-- Count users with missing names
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as users_without_name,
  COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as users_with_name
FROM users;

-- Show inventories with their owner information
SELECT 
  i.id as inventory_id,
  i.title,
  i."ownerId",
  u.email as owner_email,
  u.name as owner_name,
  CASE 
    WHEN u.name IS NULL OR u.name = '' THEN 'OWNER_NAME_MISSING'
    ELSE 'OWNER_NAME_EXISTS'
  END as owner_name_status
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
ORDER BY i."createdAt" DESC;