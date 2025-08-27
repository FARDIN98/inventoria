-- Completely disable RLS on users table to fix infinite recursion
-- This is a more aggressive approach to resolve the recursion issue

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admin_read_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_modify_all_users" ON public.users;
DROP POLICY IF EXISTS "users_own_records" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Service role can access all users" ON public.users;

-- Completely disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to roles
GRANT ALL ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';