-- Populate missing user names from email addresses
-- This will fix the 'Unknown' owner display issue

-- Update users with missing names by extracting username from email
UPDATE users 
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL OR name = '' OR TRIM(name) = '';

-- Verify the update
SELECT 
  id,
  email,
  name,
  CASE 
    WHEN name IS NULL OR name = '' THEN 'STILL_MISSING'
    ELSE 'NAME_POPULATED'
  END as name_status
FROM users 
ORDER BY "createdAt" DESC;

-- Show updated inventory owner information
SELECT 
  i.id as inventory_id,
  i.title,
  i."ownerId",
  u.email as owner_email,
  u.name as owner_name,
  CASE 
    WHEN u.name IS NULL OR u.name = '' THEN 'STILL_MISSING'
    ELSE 'NAME_AVAILABLE'
  END as owner_name_status
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
ORDER BY i."createdAt" DESC;