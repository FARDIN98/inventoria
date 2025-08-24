-- Add RLS policies for items table

-- Enable RLS on items table if not already enabled
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view items from inventories they own
CREATE POLICY "Users can view their own inventory items" ON items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = items."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Policy: Anyone can view items from public inventories
CREATE POLICY "Anyone can view public inventory items" ON items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = items."inventoryId" 
      AND inventories."isPublic" = true
    )
  );

-- Policy: Users can insert items into inventories they own
CREATE POLICY "Users can insert items into their inventories" ON items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = items."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Policy: Users can update items in inventories they own
CREATE POLICY "Users can update their inventory items" ON items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = items."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = items."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Policy: Users can delete items from inventories they own
CREATE POLICY "Users can delete their inventory items" ON items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = items."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'items'
ORDER BY policyname;