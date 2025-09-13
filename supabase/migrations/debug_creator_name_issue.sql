-- Debug creator name display issue
-- Check actual data in users and inventories tables

-- 1. Check users table data
SELECT 
  id,
  email,
  name,
  CASE 
    WHEN name IS NULL THEN 'NULL'
    WHEN name = '' THEN 'EMPTY_STRING'
    WHEN TRIM(name) = '' THEN 'WHITESPACE_ONLY'
    ELSE 'HAS_NAME'
  END as name_status
FROM users 
ORDER BY "createdAt" DESC;

-- 2. Check inventories table data with owner info
SELECT 
  i.id,
  i.title,
  i."ownerId",
  i."isPublic",
  u.name as owner_name,
  u.email as owner_email,
  CASE 
    WHEN u.name IS NULL THEN 'OWNER_NAME_NULL'
    WHEN u.name = '' THEN 'OWNER_NAME_EMPTY'
    WHEN TRIM(u.name) = '' THEN 'OWNER_NAME_WHITESPACE'
    ELSE 'OWNER_HAS_NAME'
  END as owner_name_status
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
ORDER BY i."createdAt" DESC;

-- 3. Test the exact query used in the application
SELECT 
  i.*,
  json_build_object(
    'name', u.name,
    'email', u.email
  ) as users
FROM inventories i
LEFT JOIN users u ON i."ownerId" = u.id
WHERE i."isPublic" = true
ORDER BY i."createdAt" DESC
LIMIT 5;

-- 4. Check RLS policies on users table
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
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Check table permissions
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;