-- Fix RLS policies for categories table and other public access issues

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read categories
CREATE POLICY "Allow public read access to categories" ON categories
  FOR SELECT
  TO public
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;

-- Fix other tables that might have similar issues
-- Enable RLS on inventories table if not already enabled
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to public inventories
CREATE POLICY "Allow public read access to public inventories" ON inventories
  FOR SELECT
  TO public
  USING ("isPublic" = true);

-- Create policy to allow users to read their own inventories
CREATE POLICY "Allow users to read own inventories" ON inventories
  FOR SELECT
  TO authenticated
  USING ("ownerId" = auth.uid()::text);

-- Create policy to allow users to create inventories
CREATE POLICY "Allow authenticated users to create inventories" ON inventories
  FOR INSERT
  TO authenticated
  WITH CHECK ("ownerId" = auth.uid()::text);

-- Create policy to allow users to update their own inventories
CREATE POLICY "Allow users to update own inventories" ON inventories
  FOR UPDATE
  TO authenticated
  USING ("ownerId" = auth.uid()::text)
  WITH CHECK ("ownerId" = auth.uid()::text);

-- Create policy to allow users to delete their own inventories
CREATE POLICY "Allow users to delete own inventories" ON inventories
  FOR DELETE
  TO authenticated
  USING ("ownerId" = auth.uid()::text);

-- Grant permissions on inventories
GRANT SELECT ON inventories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON inventories TO authenticated;

-- Enable RLS on tags table
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read tags
CREATE POLICY "Allow public read access to tags" ON tags
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow authenticated users to create tags
CREATE POLICY "Allow authenticated users to create tags" ON tags
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions on tags
GRANT SELECT ON tags TO anon, authenticated;
GRANT INSERT ON tags TO authenticated;

-- Enable RLS on inventory_tags table
ALTER TABLE inventory_tags ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to inventory_tags for public inventories
CREATE POLICY "Allow public read access to inventory_tags" ON inventory_tags
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = inventory_tags."inventoryId" 
      AND inventories."isPublic" = true
    )
  );

-- Create policy to allow users to read inventory_tags for their own inventories
CREATE POLICY "Allow users to read own inventory_tags" ON inventory_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = inventory_tags."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Create policy to allow users to manage inventory_tags for their own inventories
CREATE POLICY "Allow users to manage own inventory_tags" ON inventory_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = inventory_tags."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = inventory_tags."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Grant permissions on inventory_tags
GRANT SELECT ON inventory_tags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON inventory_tags TO authenticated;