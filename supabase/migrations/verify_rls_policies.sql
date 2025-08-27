-- Verify RLS policies are working correctly for items table
-- This script checks if the policies allow authenticated users to access public inventory items

-- Check current RLS policies on items table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'items'
ORDER BY policyname;

-- Check permissions granted to authenticated role
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated') 
    AND table_name IN ('items', 'inventories')
ORDER BY table_name, grantee;

-- Test query to see if authenticated users can access public inventory items
-- This should work if RLS policies are correct
SELECT 
    i.id,
    i."customId",
    i."inventoryId",
    inv.title as inventory_title,
    inv."isPublic",
    inv."ownerId"
FROM items i
JOIN inventories inv ON i."inventoryId" = inv.id
WHERE inv."isPublic" = true
LIMIT 5;