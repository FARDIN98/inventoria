-- Fix RLS policies to allow non-authenticated users to view public inventory items
-- This addresses the issue where non-authenticated users cannot view items from public inventories

-- First, enable RLS on inventories table if not already enabled
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own inventories" ON inventories;
DROP POLICY IF EXISTS "Public inventories are viewable by everyone" ON inventories;
DROP POLICY IF EXISTS "Authenticated users can view public inventories" ON inventories;
DROP POLICY IF EXISTS "Users can insert their own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can update their own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can delete their own inventories" ON inventories;

-- Create comprehensive RLS policies for inventories table
-- Policy 1: Allow everyone (including non-authenticated users) to view public inventories
CREATE POLICY "Allow public access to public inventories" ON inventories
    FOR SELECT
    USING ("isPublic" = true);

-- Policy 2: Allow authenticated users to view their own inventories (public or private)
CREATE POLICY "Allow users to view own inventories" ON inventories
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = "ownerId");

-- Policy 3: Allow users to insert their own inventories
CREATE POLICY "Allow users to insert own inventories" ON inventories
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = "ownerId");

-- Policy 4: Allow users to update their own inventories
CREATE POLICY "Allow users to update own inventories" ON inventories
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = "ownerId")
    WITH CHECK (auth.uid()::text = "ownerId");

-- Policy 5: Allow users to delete their own inventories
CREATE POLICY "Allow users to delete own inventories" ON inventories
    FOR DELETE
    TO authenticated
    USING (auth.uid()::text = "ownerId");

-- Now fix the items table policies
-- Drop existing policies to avoid conflicts
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

-- Create comprehensive RLS policies for items table
-- Policy 1: Allow everyone (including non-authenticated users) to view items from public inventories
CREATE POLICY "Allow public access to public inventory items" ON items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM inventories 
            WHERE inventories.id = items."inventoryId" 
            AND inventories."isPublic" = true
        )
    );

-- Policy 2: Allow authenticated users to view items from inventories they own
CREATE POLICY "Allow users to view own inventory items" ON items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM inventories 
            WHERE inventories.id = items."inventoryId" 
            AND inventories."ownerId" = auth.uid()::text
        )
    );

-- Policy 3: Allow authenticated users to insert items into inventories they own
CREATE POLICY "Allow users to insert items into own inventories" ON items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM inventories 
            WHERE inventories.id = items."inventoryId" 
            AND inventories."ownerId" = auth.uid()::text
        )
    );

-- Policy 4: Allow authenticated users to insert items into public inventories
CREATE POLICY "Allow users to insert items into public inventories" ON items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM inventories 
            WHERE inventories.id = items."inventoryId" 
            AND inventories."isPublic" = true
        )
    );

-- Policy 5: Allow authenticated users to update items in inventories they own
CREATE POLICY "Allow users to update own inventory items" ON items
    FOR UPDATE
    TO authenticated
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

-- Policy 6: Allow authenticated users to update items in public inventories
CREATE POLICY "Allow users to update items in public inventories" ON items
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM inventories 
            WHERE inventories.id = items."inventoryId" 
            AND inventories."isPublic" = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM inventories 
            WHERE inventories.id = items."inventoryId" 
            AND inventories."isPublic" = true
        )
    );

-- Policy 7: Allow authenticated users to delete items from inventories they own
CREATE POLICY "Allow users to delete own inventory items" ON items
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM inventories 
            WHERE inventories.id = items."inventoryId" 
            AND inventories."ownerId" = auth.uid()::text
        )
    );

-- Policy 8: Allow authenticated users to delete items from public inventories
CREATE POLICY "Allow users to delete items from public inventories" ON items
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM inventories 
            WHERE inventories.id = items."inventoryId" 
            AND inventories."isPublic" = true
        )
    );

-- Grant necessary permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON inventories TO anon, authenticated;
GRANT SELECT ON items TO anon, authenticated;
GRANT ALL ON inventories TO authenticated;
GRANT ALL ON items TO authenticated;

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
WHER