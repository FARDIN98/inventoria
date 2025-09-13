-- Verify that owner data is now properly linked
-- Check current state after the fix

SELECT 
  'Final verification - inventories with owner info' as status,
  i.id,
  i.title,
  i."ownerId",
  u.name as owner_name,
  u.email as owner_email,
  CASE 
    WHEN u.name IS NOT NULL AND u.name != '' THEN 'HAS_NAME'
    WHEN u.email IS NOT NULL THEN 'EMAIL_ONLY'
    ELSE 'NO_OWNER_DATA'
  END as owner_status
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
ORDER BY i."createdAt" DESC
LIMIT 10;

-- Count summary
SELECT 
  COUNT(*) as total_inventories,
  COUNT(u.id) as inventories_with_owner,
  COUNT(CASE WHEN u.name IS NOT NULL AND u.name != '' THEN 1 END) as inventories_with_owner_name,
  COUNT(CASE WHEN u.name IS NULL OR u.name = '' THEN 1 END) as inventories_without_owner_name
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id;