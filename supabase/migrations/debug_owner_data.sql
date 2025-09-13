-- Debug owner data issue
-- Check users table data
SELECT id, email, name, 'users_table' as source FROM users LIMIT 10;

-- Check inventories table with ownerId
SELECT id, title, "ownerId", 'inventories_table' as source FROM inventories LIMIT 10;

-- Check join between inventories and users
SELECT 
  i.id as inventory_id,
  i.title,
  i."ownerId",
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  CASE 
    WHEN u.id IS NULL THEN 'NO_USER_MATCH'
    WHEN u.name IS NULL OR u.name = '' THEN 'USER_NO_NAME'
    ELSE 'USER_HAS_NAME'
  END as status
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
ORDER BY i."createdAt" DESC
LIMIT 10;

-- Check for data type issues
SELECT 
  'users.id type' as check_type,
  pg_typeof(id) as data_type,
  length(id) as id_length,
  id as sample_value
FROM users 
LIMIT 1;

SELECT 
  'inventories.ownerId type' as check_type,
  pg_typeof("ownerId") as data_type,
  length("ownerId") as id_length,
  "ownerId" as sample_value
FROM inventories 
LIMIT 1;