-- Enable RLS on categories table and grant permissions
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories (they are public data)
CREATE POLICY "Allow public read access to categories" ON categories
  FOR SELECT
  USING (true);

-- Grant necessary permissions
GRANT SELECT ON categories TO anon, authenticated;
GRANT ALL ON categories TO authenticated;

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'categories';