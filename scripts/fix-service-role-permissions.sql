-- Fix service role permissions for admin operations
-- This script grants all necessary permissions to the service role

-- Grant usage on schema public to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant all privileges on all tables in public schema to service_role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant all privileges on all sequences in public schema to service_role
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant all privileges on all functions in public schema to service_role
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Set default privileges for future tables, sequences, and functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;

-- Specifically grant permissions on users table
GRANT ALL PRIVILEGES ON public.users TO service_role;

-- Grant permissions on other important tables
GRANT ALL PRIVILEGES ON public.inventories TO service_role;
GRANT ALL PRIVILEGES ON public.items TO service_role;
GRANT ALL PRIVILEGES ON public.accounts TO service_role;
GRANT ALL PRIVILEGES ON public.sessions TO service_role;
GRANT ALL PRIVILEGES ON public.access TO service_role;
GRANT ALL PRIVILEGES ON public.discussion_posts TO service_role;
GRANT ALL PRIVILEGES ON public.likes TO service_role;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Create policy for service_role to access all records
CREATE POLICY "service_role_full_access" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for admin users to access all user records
CREATE POLICY "admin_full_access" ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid()::text
      AND admin_user.role = 'ADMIN'
      AND admin_user."isBlocked" = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid()::text
      AND admin_user.role = 'ADMIN'
      AND admin_user."isBlocked" = false
    )
  );

-- Create policy for users to access their own records
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);