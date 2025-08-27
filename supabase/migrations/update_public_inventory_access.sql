-- Comprehensive RLS policy update for public inventory access
-- This migration ensures authenticated users can add/edit/delete items in public inventories

-- First, drop ALL existing item policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own inventory items" ON items;
DROP POLICY IF EXISTS "Anyone can view public inventory items" ON items;
DROP POLICY IF EXISTS "Users can insert items into their inventories" ON items;
DROP POLICY IF EXISTS "Users can update their inventory items" ON items;
DROP POLICY IF EXISTS "Users can delete their inventory items" ON items;
DROP POLICY IF EXISTS "Users can insert items into owned or public inventories" ON items;
DROP POLICY IF EXISTS "Users can update items in owned or public inventories" ON items;
DROP POLICY IF EXISTS "Users can delete items from owned or public inventories" ON items;
DROP POLICY IF EXISTS "Service role can access all items" ON items;
DROP POLICY IF EXISTS "Admins can manage all items" ON items;

-- Enable RLS on items table if not already enabled
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view items from inventories they own
CREATE POLICY "Users can view their own inventory items" ON items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = items."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
  );

-- Policy 2: Anyone can view items from public inventories
CREATE POLICY "Anyone can view public inventory items" ON items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = items."inventoryId" 
      AND inventories."isPublic" = true
    )
  );

-- Policy 3: Authenticated users can insert items into inventories they own OR public inventories
CREATE POLICY "Users can insert items into owned or public inventories" ON items
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- User owns the inventory
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = items."inventoryId" 
        AND inventories."ownerId" = auth.uid()::text
      )
      OR
      -- Inventory is public
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = items."inventoryId" 
        AND inventories."isPublic" = true
      )
    )
  );

-- Policy 4: Authenticated users can update items in inventories they own OR public inventories
CREATE POLICY "Users can update items in owned or public inventories" ON items
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      -- User owns the inventory
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = items."inventoryId" 
        AND inventories."ownerId" = auth.uid()::text
      )
      OR
      -- Inventory is public
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = items."inventoryId" 
        AND inventories."isPublic" = true
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- User owns the inventory
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = items."inventoryId" 
        AND inventories."ownerId" = auth.uid()::text
      )
      OR
      -- Inventory is public
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = items."inventoryId" 
        AND inventories."isPublic" = true
      )
    )
  );

-- Policy 5: Authenticated users can delete items from inventories they own OR public inventories
CREATE POLICY "Users can delete items from owned or public inventories" ON items
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      -- User owns the inventory
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = items."inventoryId" 
        AND inventories."ownerId" = auth.uid()::text
      )
      OR
      -- Inventory is public
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = items."inventoryId" 
        AND inventories."isPublic" = true
      )
    )
  );

-- Policy 6: Service role can access all items (for admin operations)
CREATE POLICY "Service role can access all items" ON items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 7: Admins can manage all items
CREATE POLICY "Admins can manage all items" ON items
  FOR ALL
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

-- Grant necessary permissions to authenticated role for items table
GRANT SELECT, INSERT, UPDATE, DELETE ON items TO authenticated;

-- Grant necessary permissions to authenticated role for inventories table (for checking isPublic)
GRANT SELECT ON inventories TO authenticated;

-- Grant necessary permissions to anon role for reading public items
GRANT SELECT ON items TO anon;
GRANT SELECT ON inventories TO anon;

-- Verify the new policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'items'
ORDER BY policyname;