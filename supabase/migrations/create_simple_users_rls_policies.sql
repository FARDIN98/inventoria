-- Create simple, non-recursive RLS policies for users table

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to read their own profile
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    USING (auth.uid()::text = id);

-- Policy 2: Allow users to update their own profile
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- Policy 3: Allow service role to read all users (for admin functions)
CREATE POLICY "users_select_service_role" ON public.users
    FOR SELECT
    USING (auth.role() = 'service_role');

-- Policy 4: Allow service role to insert users (for user creation)
CREATE POLICY "users_insert_service_role" ON public.users
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Policy 5: Allow service role to update users (for admin functions)
CREATE POLICY "users_update_service_role" ON public.users
    FOR UPDATE
    USING (auth.role() = 'service_role');

-- Policy 6: Allow service role to delete users (for admin functions)
CREATE POLICY "users_delete_service_role" ON public.users
    FOR DELETE
    USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

-- Verify policies are created
SELECT 
    policyname, 
    cmd, 
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;