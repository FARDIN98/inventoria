-- Add RLS policies for discussion_posts table
-- Only authenticated users, inventory owners, and admins can access discussion posts

-- Enable RLS on discussion_posts table
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view discussion posts" ON discussion_posts;
DROP POLICY IF EXISTS "Allow authenticated users to create discussion posts" ON discussion_posts;
DROP POLICY IF EXISTS "Allow users to update own discussion posts" ON discussion_posts;
DROP POLICY IF EXISTS "Allow users to delete own discussion posts" ON discussion_posts;
DROP POLICY IF EXISTS "Allow admins full access to discussion posts" ON discussion_posts;

-- Policy 1: Allow authenticated users to view discussion posts for inventories they own or public inventories
CREATE POLICY "Allow authenticated users to view discussion posts" ON discussion_posts
  FOR SELECT
  TO authenticated
  USING (
    -- User can view posts if they own the inventory
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = discussion_posts."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
    OR
    -- User can view posts if the inventory is public
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = discussion_posts."inventoryId" 
      AND inventories."isPublic" = true
    )
    OR
    -- Admin users can view all posts
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
    )
  );

-- Policy 2: Allow authenticated users to create discussion posts for inventories they own or public inventories
CREATE POLICY "Allow authenticated users to create discussion posts" ON discussion_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- User can create posts if they own the inventory
    (
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = discussion_posts."inventoryId" 
        AND inventories."ownerId" = auth.uid()::text
      )
      OR
      -- User can create posts if the inventory is public
      EXISTS (
        SELECT 1 FROM inventories 
        WHERE inventories.id = discussion_posts."inventoryId" 
        AND inventories."isPublic" = true
      )
      OR
      -- Admin users can create posts on any inventory
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role = 'ADMIN'
      )
    )
    AND
    -- Ensure the authorId matches the authenticated user
    discussion_posts."authorId" = auth.uid()::text
  );

-- Policy 3: Allow users to update their own discussion posts (or admins can update any)
CREATE POLICY "Allow users to update own discussion posts" ON discussion_posts
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own posts
    discussion_posts."authorId" = auth.uid()::text
    OR
    -- Admin users can update any post
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    -- User can update their own posts
    discussion_posts."authorId" = auth.uid()::text
    OR
    -- Admin users can update any post
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
    )
  );

-- Policy 4: Allow users to delete their own discussion posts (or admins/inventory owners can delete any)
CREATE POLICY "Allow users to delete own discussion posts" ON discussion_posts
  FOR DELETE
  TO authenticated
  USING (
    -- User can delete their own posts
    discussion_posts."authorId" = auth.uid()::text
    OR
    -- Inventory owner can delete any post in their inventory
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = discussion_posts."inventoryId" 
      AND inventories."ownerId" = auth.uid()::text
    )
    OR
    -- Admin users can delete any post
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'ADMIN'
    )
  );

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON discussion_posts TO authenticated;

-- Grant permissions to anon role for public inventory posts (read-only)
GRANT SELECT ON discussion_posts TO anon;

-- Create policy for anonymous users to view posts on public inventories
CREATE POLICY "Allow anonymous users to view public discussion posts" ON discussion_posts
  FOR SELECT
  TO anon
  USING (
    -- Anonymous users can only view posts on public inventories
    EXISTS (
      SELECT 1 FROM inventories 
      WHERE inventories.id = discussion_posts."inventoryId" 
      AND inventories."isPublic" = true
    )
  );

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'discussion_posts'
ORDER BY policyname;