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

-- Also check if RLS is enabled on items table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'items';

-- Check table permissions for authenticated role
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'items'
    AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;