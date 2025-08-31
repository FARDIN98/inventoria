-- Add RLS policies for field_templates table
-- Only inventory owners and admins can manage field templates

-- Enable RLS on field_templates table
ALTER TABLE field_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view field templates for their inventories" ON field_templates;
DROP POLICY IF EXISTS "Users can view field templates for public inventories" ON field_templates;
DROP POLICY IF EXISTS "Users can insert field templates for owned inventories" ON field_templates;
DROP POLICY IF EXISTS "Users can update field templates for owned inventories" ON field_templates;
DROP POLICY IF EXISTS "Users can delete field templates for owned inventories" ON field_templates;
DROP POLICY IF EXISTS "Admins can manage all field templates" ON field_templates;
DROP POLICY IF EXISTS "Service role can access all field templates" ON field_templates;

-- Policy: Users can view field templates for inventories they own
CREATE POLICY "Users can view field templates for their inventories" ON field_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = field_templates."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Policy: Anyone can view field templates for public inventories (read-only)
CREATE POLICY "Users can view field templates for public inventories" ON field_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = field_templates."inventoryId" 
      AND inventories."isPublic" = true
    )
  );

-- Policy: Users can insert field templates for inventories they own
CREATE POLICY "Users can insert field templates for owned inventories" ON field_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = field_templates."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Policy: Users can update field templates for inventories they own
CREATE POLICY "Users can update field templates for owned inventories" ON field_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = field_templates."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = field_templates."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Policy: Users can delete field templates for inventories they own
CREATE POLICY "Users can delete field templates for owned inventories" ON field_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = field_templates."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Policy: Admins can manage all field templates
CREATE POLICY "Admins can manage all field templates" ON field_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
    )
  );

-- Policy: Service role can access all field templates (for server-side operations)
CREATE POLICY "Service role can access all field templates" ON field_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON field_templates TO authenticated;
GRANT ALL ON field_templates TO service_role;

-- Verify the policies are created
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
WHERE tablename = 'field_templates'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'field_templates';