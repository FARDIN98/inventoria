-- Fix admin permissions for users table
-- This script grants necessary permissions to admin users to view all users

-- Grant SELECT permission on users table to authenticated role
GRANT SELECT ON public.users TO authenticated;

-- Grant ALL permissions on users table to service_role
GRANT ALL ON public.users TO service_role;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Service role can access all users" ON public.users;

-- Create RLS policy to allow admins to see all users
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_user 
      WHERE admin_user.id = auth.uid()::text 
      AND admin_user.role = 'ADMIN' 
      AND admin_user."isBlocked" = false
    )
  );

-- Create RLS policy to allow service role to access all users
CREATE POLICY "Service role can access all users" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee;