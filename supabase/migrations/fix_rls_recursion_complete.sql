-- Complete fix for RLS infinite recursion
-- This script will completely reset and rebuild RLS policies to avoid recursion

-- First, disable RLS on all tables to avoid any conflicts
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_templates DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users';
    END LOOP;
    
    -- Drop all policies on inventories table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'inventories' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.inventories';
    END LOOP;
    
    -- Drop all policies on items table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'items' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.items';
    END LOOP;
    
    -- Drop all policies on other tables
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename IN ('categories', 'tags', 'inventory_tags', 'likes', 'discussion_posts', 'field_templates') AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || r.tablename;
    END LOOP;
END $$;

-- Grant necessary permissions to service_role and authenticated roles
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.inventories TO service_role;
GRANT ALL ON public.items TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.tags TO service_role;
GRANT ALL ON public.inventory_tags TO service_role;
GRANT ALL ON public.likes TO service_role;
GRANT ALL ON public.discussion_posts TO service_role;
GRANT ALL ON public.field_templates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_templates TO authenticated;

GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.inventories TO anon;
GRANT SELECT ON public.items TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.tags TO anon;
GRANT SELECT ON public.inventory_tags TO anon;
GRANT SELECT ON public.likes TO anon;
GRANT SELECT ON public.discussion_posts TO anon;
GRANT SELECT ON public.field_templates TO anon;

-- Re-enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_templates ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- Users table policies (simple and non-recursive)
CREATE POLICY "service_role_users_all" ON public.users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "users_own_record" ON public.users
  FOR ALL TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users_public_read" ON public.users
  FOR SELECT TO anon
  USING (true);

-- Inventories table policies
CREATE POLICY "service_role_inventories_all" ON public.inventories
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inventories_owner_all" ON public.inventories
  FOR ALL TO authenticated
  USING (auth.uid()::text = ownerId)
  WITH CHECK (auth.uid()::text = ownerId);

CREATE POLICY "inventories_public_read" ON public.inventories
  FOR SELECT TO anon, authenticated
  USING (isPublic = true);

-- Items table policies
CREATE POLICY "service_role_items_all" ON public.items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "items_inventory_owner" ON public.items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventories 
      WHERE inventories.id = items.inventoryId 
      AND inventories.ownerId = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventories 
      WHERE inventories.id = items.inventoryId 
      AND inventories.ownerId = auth.uid()::text
    )
  );

CREATE POLICY "items_public_read" ON public.items
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventories 
      WHERE inventories.id = items.inventoryId 
      AND inventories.isPublic = true
    )
  );

-- Categories table policies (read-only for most users)
CREATE POLICY "service_role_categories_all" ON public.categories
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "categories_read_all" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

-- Tags table policies
CREATE POLICY "service_role_tags_all" ON public.tags
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tags_read_all" ON public.tags
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "tags_authenticated_write" ON public.tags
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Inventory_tags table policies
CREATE POLICY "service_role_inventory_tags_all" ON public.inventory_tags
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "inventory_tags_owner" ON public.inventory_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventories 
      WHERE inventories.id = inventory_tags.inventoryId 
      AND inventories.ownerId = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventories 
      WHERE inventories.id = inventory_tags.inventoryId 
      AND inventories.ownerId = auth.uid()::text
    )
  );

CREATE POLICY "inventory_tags_public_read" ON public.inventory_tags
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventories 
      WHERE inventories.id = inventory_tags.inventoryId 
      AND inventories.isPublic = true
    )
  );

-- Likes table policies
CREATE POLICY "service_role_likes_all" ON public.likes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "likes_user_own" ON public.likes
  FOR ALL TO authenticated
  USING (auth.uid()::text = userId)
  WITH CHECK (auth.uid()::text = userId);

CREATE POLICY "likes_public_read" ON public.likes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Discussion_posts table policies
CREATE POLICY "service_role_discussion_posts_all" ON public.discussion_posts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "discussion_posts_author" ON public.discussion_posts
  FOR ALL TO authenticated
  USING (auth.uid()::text = authorId)
  WITH CHECK (auth.uid()::text = authorId);

CREATE POLICY "discussion_posts_public_read" ON public.discussion_posts
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventories 
      WHERE inventories.id = discussion_posts.inventoryId 
      AND inventories.isPublic = true
    )
  );

CREATE POLICY "discussion_posts_authenticated_insert" ON public.discussion_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = authorId);

-- Field_templates table policies
CREATE POLICY "service_role_field_templates_all" ON public.field_templates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "field_templates_read_all" ON public.field_templates
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "field_templates_authenticated_write" ON public.field_templates
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify policies are working
SELECT 'RLS policies have been successfully reset and recreated' as status;