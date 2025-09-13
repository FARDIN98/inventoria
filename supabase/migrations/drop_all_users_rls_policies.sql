-- Drop all existing RLS policies for users table to fix infinite recursion

-- First, get all policy names and drop them
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Loop through all policies on users table and drop them
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Verify all policies are dropped
SELECT 
    COUNT(*) as remaining_policies
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';