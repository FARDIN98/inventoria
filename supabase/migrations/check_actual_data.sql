-- Simple check of actual data to see what's happening

-- Check if users have names
SELECT id, email, name FROM users LIMIT 10;

-- Check inventory with owner join
SELECT 
  i.id,
  i.title,
  i."ownerId",
  u.name as owner_name,
  u.email as owner_email
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
LIMIT 5;