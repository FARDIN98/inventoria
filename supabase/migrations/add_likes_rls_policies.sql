-- Enable RLS on likes table
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access to like counts (for non-authenticated users)
-- This allows anyone to see the total number of likes on items
CREATE POLICY "Allow public read access to likes for counting" ON likes
  FOR SELECT
  USING (true);

-- Policy 2: Allow authenticated users to read all likes data
-- This allows authenticated users to see detailed likes information
CREATE POLICY "Allow authenticated users to read likes" ON likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Allow authenticated users to insert likes for accessible items
-- Users can like items in public inventories or their own inventories
CREATE POLICY "Allow authenticated users to like accessible items" ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only like items they have access to
    EXISTS (
      SELECT 1 FROM items i
      JOIN inventories inv ON i."inventoryId" = inv.id
      WHERE i.id = likes."itemId"
      AND (
        -- Public inventories
        inv."isPublic" = true
        -- Own inventories
        OR inv."ownerId" = auth.uid()::text
        -- Admin users (check user role)
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()::text
          AND u.role = 'ADMIN'
        )
      )
    )
    -- Ensure user can only like as themselves
    AND "userId" = auth.uid()::text
  );

-- Policy 4: Allow users to delete their own likes
-- Users can unlike items they have previously liked
CREATE POLICY "Allow users to delete their own likes" ON likes
  FOR DELETE
  TO authenticated
  USING (
    "userId" = auth.uid()::text
    -- Additional check: ensure the item is still accessible
    AND EXISTS (
      SELECT 1 FROM items i
      JOIN inventories inv ON i."inventoryId" = inv.id
      WHERE i.id = likes."itemId"
      AND (
        -- Public inventories
        inv."isPublic" = true
        -- Own inventories
        OR inv."ownerId" = auth.uid()::text
        -- Admin users
        OR EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()::text
          AND u.role = 'ADMIN'
        )
      )
    )
  );

-- Policy 5: Allow users to update their own likes (if needed for future features)
CREATE POLICY "Allow users to update their own likes" ON likes
  FOR UPDATE
  TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Policy 6: Allow admins full access to likes table
CREATE POLICY "Allow admins full access to likes" ON likes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::text
      AND u.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::text
      AND u.role = 'ADMIN'
    )
  );

-- Grant necessary permissions to roles
-- Allow anonymous users to read likes (for counting)
GRANT SELECT ON likes TO anon;

-- Allow authenticated users to perform CRUD operations on likes
GRANT SELECT, INSERT, UPDATE, DELETE ON likes TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_likes_item_id ON likes("itemId");
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes("userId");
CREATE INDEX IF NOT EXISTS idx_likes_item_user ON likes("itemId", "userId");
CREATE INDEX IF NOT EXISTS idx_likes_liked_at ON likes("likedAt");

-- Add comments for documentation
COMMENT ON POLICY "Allow public read access to likes for counting" ON likes IS 
'Allows anyone (including non-authenticated users) to read likes data for counting purposes. This enables displaying like counts to all users.';

COMMENT ON POLICY "Allow authenticated users to read likes" ON likes IS 
'Allows authenticated users to read all likes data, including detailed information about who liked what.';

COMMENT ON POLICY "Allow authenticated users to like accessible items" ON likes IS 
'Allows authenticated users to like items in public inventories, their own inventories, or if they are admins. Ensures users can only create likes as themselves.';

COMMENT ON POLICY "Allow users to delete their own likes" ON likes IS 
'Allows users to unlike (delete) their own likes, but only for items they still have access to.';

COMMENT ON POLICY "Allow users to update their own likes" ON likes IS 
'Allows users to update their own likes. Currently not used but available for future features like like timestamps or reactions.';

COMMENT ON POLICY "Allow admins full access to likes" ON likes IS 
'Gives administrators full CRUD access to the likes table for management purposes.';