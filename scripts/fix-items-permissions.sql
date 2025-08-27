-- Fix items table permissions for admin and service role access

-- Grant all permissions on items table to service_role
GRANT ALL ON public.items TO service_role;

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can manage all items" ON public.items;
DROP POLICY IF EXISTS "Service role can access all items" ON public.items;

-- Create policy for service_role to access all items
CREATE POLICY "Service role can access all items" ON public.items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for admins to manage all items
-- This policy allows admins to view, create, edit, and delete any items
CREATE POLICY "Admins can manage all items" ON public.items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN' 
      AND users."isBlocked" = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN' 
      AND users."isBlocked" = false
    )
  );

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'items'
ORDER BY policyname;