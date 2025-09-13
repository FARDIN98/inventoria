-- Test the exact Supabase query used in getUserInventoriesAction
-- This simulates the query: users:ownerId(name, email)

SELECT 
  i.*,
  json_build_object(
    'name', u.name,
    'email', u.email
  ) as users
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
ORDER BY i."createdAt" DESC
LIMIT 5;

-- Also test the specific user relation syntax that Supabase uses
-- Check if there are any issues with the foreign key relationship
SELECT 
  i.id,
  i.title,
  i."ownerId",
  u.id as user_id,
  u.name,
  u.email,
  CASE 
    WHEN i."ownerId" = u.id THEN 'MATCH'
    ELSE 'NO_MATCH'
  END as relationship_status
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
WHERE i."ownerId" IS NOT NULL
ORDER BY i."createdAt" DESC;