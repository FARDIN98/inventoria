-- Add admin policies for inventories table to allow admins to manage any inventory
-- This fixes the issue where admins cannot create custom IDs for any inventory

-- Add policy to allow admins to update any inventory
CREATE POLICY "Allow admins to update any inventory" ON inventories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
      AND users."isBlocked" = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
      AND users."isBlocked" = false
    )
  );

-- Add policy to allow admins to delete any inventory
CREATE POLICY "Allow admins to delete any inventory" ON inventories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
      AND users."isBlocked" = false
    )
  );

-- Add policy to allow admins to read any inventory (including private ones)
CREATE POLICY "Allow admins to read any inventory" ON inventories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
      AND users."isBlocked" = false
    )
  );

-- Verify the new policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'inventories' AND policyname LIKE '%admin%'
ORDER BY policyname;