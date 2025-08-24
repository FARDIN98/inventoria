-- Enable RLS on inventories table
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can insert their own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can update their own inventories" ON inventories;
DROP POLICY IF EXISTS "Users can delete their own inventories" ON inventories;

-- Create RLS policies for inventories table
-- Policy for SELECT (viewing inventories)
CREATE POLICY "Users can view their own inventories" ON inventories
    FOR SELECT USING (auth.uid()::text = "ownerId");

-- Policy for INSERT (creating inventories)
CREATE POLICY "Users can insert their own inventories" ON inventories
    FOR INSERT WITH CHECK (auth.uid()::text = "ownerId");

-- Policy for UPDATE (updating inventories)
CREATE POLICY "Users can update their own inventories" ON inventories
    FOR UPDATE USING (auth.uid()::text = "ownerId");

-- Policy for DELETE (deleting inventories)
CREATE POLICY "Users can delete their own inventories" ON inventories
    FOR DELETE USING (auth.uid()::text = "ownerId");

-- Enable RLS on categories table if it exists
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for categories if they exist
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;

-- Create policy for categories (allow all authenticated users to read)
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert some default categories if they don't exist
INSERT INTO categories (id, name, description) 
VALUES 
    (gen_random_uuid()::text, 'Equipment', 'Office equipment, tools, and machinery'),
    (gen_random_uuid()::text, 'Furniture', 'Desks, chairs, tables, and other furniture items'),
    (gen_random_uuid()::text, 'Book', 'Books, manuals, and printed materials'),
    (gen_random_uuid()::text, 'Other', 'Miscellaneous items that dont fit other categories')
ON CONFLICT (name) DO NOTHING;

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('inventories', 'categories');