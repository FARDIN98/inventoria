-- Add full-text search infrastructure with computed tsvector columns and GIN indexes
-- This enables PostgreSQL native full-text search for inventories and items
-- Computed columns automatically update when source data changes

-- Add search_vector column to inventories table
-- Includes title, description, and categoryId for comprehensive search
ALTER TABLE inventories ADD COLUMN search_vector TSVECTOR 
GENERATED ALWAYS AS (
    to_tsvector('english', 
        COALESCE(title,'') || ' ' || 
        COALESCE(description,'') || ' ' || 
        COALESCE("categoryId",'')
    )
) STORED;

-- Create GIN index for inventories search performance
CREATE INDEX inventories_search_idx ON inventories USING GIN (search_vector);

-- Add search_vector column to items table
-- Includes customId and all text fields for comprehensive item search
ALTER TABLE items ADD COLUMN search_vector TSVECTOR 
GENERATED ALWAYS AS (
    to_tsvector('english', 
        COALESCE("customId",'') || ' ' || 
        COALESCE(text1,'') || ' ' || 
        COALESCE(text2,'') || ' ' || 
        COALESCE(text3,'') || ' ' || 
        COALESCE("textArea1",'') || ' ' || 
        COALESCE("textArea2",'')
    )
) STORED;

-- Create GIN index for items search performance
CREATE INDEX items_search_idx ON items USING GIN (search_vector);

-- Grant permissions to anon and authenticated roles for search functionality
GRANT SELECT ON inventories TO anon;
GRANT SELECT ON inventories TO authenticated;
GRANT SELECT ON items TO anon;
GRANT SELECT ON items TO authenticated;

-- Example usage:
-- SELECT * FROM inventories WHERE search_vector @@ to_tsquery('english', 'laptop');
-- SELECT * FROM items WHERE search_vector @@ to_tsquery('english', 'book & manual');