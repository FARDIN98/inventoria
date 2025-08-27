-- Fix RLS infinite recursion by simplifying policies

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admin_read_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_modify_all_users" ON public.users;
DROP POLICY IF EXISTS "users_own_records" ON public.users;

-- Disable RLS temporarily to avoid recursion
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create simple policy for service_role to access all records
CREATE POLICY "service_role_full_access" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create simple policy for users to access their own records
CREATE POLICY "users_own_records" ON public.users
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- For now, let's create a simple admin policy that doesn't cause recursion
-- We'll handle admin permissions through the service role key in the application
-- This is a temporary solution to avoid the recursion issue

-- Grant additional permissions to ensure service role works
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.inventories TO service_role;
GRANT ALL ON public.items TO service_role;