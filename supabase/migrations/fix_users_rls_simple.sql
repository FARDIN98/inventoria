-- Simple fix for users table RLS recursion
-- Only fix the users table which is causing the recursion issue

-- Disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admin_read_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_modify_all_users" ON public.users;
DROP POLICY IF EXISTS "users_own_records" ON public.users;
DROP POLICY IF EXISTS "service_role_users_all" ON public.users;
DROP POLICY IF EXISTS "users_own_record" ON public.users;
DROP POLICY IF EXISTS "users_public_read" ON public.users;

-- Grant permissions
GRANT ALL ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "service_role_users_all" ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "users_own_record" ON public.users
  FOR ALL TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users_public_read" ON public.users
  FOR SELECT TO anon
  USING (true);

-- Verify the fix
SELECT 'Users table RLS policies fixed successfully' as status;