-- Add predefined categories as mentioned in project requirements
-- Categories: Equipment, Furniture, Book, Other

-- Insert some default categories if they don't exist
INSERT INTO categories (id, name, description) 
VALUES 
    (gen_random_uuid()::text, 'Equipment', 'Office equipment, tools, and machinery'),
    (gen_random_uuid()::text, 'Furniture', 'Desks, chairs, tables, and other furniture items'),
    (gen_random_uuid()::text, 'Book', 'Books, manuals, and printed materials'),
    (gen_random_uuid()::text, 'Tech', 'Pc, smartphone, software'),
    (gen_random_uuid()::text, 'SkinCare', 'Skin care items for man & woman'),
    (gen_random_uuid()::text, 'Other', 'Miscellaneous items that dont fit other categories')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions to anon and authenticated roles for categories table
GRANT SELECT ON categories TO anon;
GRANT SELECT ON categories TO authenticated;