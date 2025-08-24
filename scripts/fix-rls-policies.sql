-- Add policy to allow public access to public inventories
CREATE POLICY "Public inventories are viewable by everyone" ON inventories
    FOR SELECT USING ("isPublic" = true);

-- Add policy to allow authenticated users to view public inventories
CREATE POLICY "Authenticated users can view public inventories" ON inventories
    FOR SELECT USING ("isPublic" = true AND auth.role() = 'authenticated');

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'inventories';