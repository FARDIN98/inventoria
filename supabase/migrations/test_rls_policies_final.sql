-- Final test to verify RLS policies are working correctly
-- This script tests that authenticated users can access public inventory items

-- Check all current RLS policies on items table
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'items'
ORDER BY cmd, policyname;

-- Check permissions granted to authenticated role
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name IN ('items', 'inventories')
    AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- Verify RLS is enabled on items table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'items';

-- Test query that authenticated users would run to access public inventory items
-- This simulates what happens when an authenticated user tries to view/edit public items
EXPLAIN (ANALYZE, BUFFERS) 
SELECT i.* 
FROM items i
JOIN inventories inv ON inv.id = i."inventoryId"
WHERE inv."isPublic" = true
LIMIT 5;