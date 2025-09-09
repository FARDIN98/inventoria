-- Create a function to bulk delete users and their associated items
-- This function handles the foreign key constraint by deleting items first, then users

CREATE OR REPLACE FUNCTION bulk_delete_users_with_items(user_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all items created by the users first
  DELETE FROM items WHERE "createdById" = ANY(user_ids);
  
  -- Delete all likes by the users
  DELETE FROM likes WHERE "userId" = ANY(user_ids);
  
  -- Delete all discussion posts by the users
  DELETE FROM discussion_posts WHERE "authorId" = ANY(user_ids);
  
  -- Delete all access permissions for the users
  DELETE FROM access WHERE "userId" = ANY(user_ids);
  
  -- Delete all inventories owned by the users (this will cascade to related items, field_templates, etc.)
  DELETE FROM inventories WHERE "ownerId" = ANY(user_ids);
  
  -- Delete all accounts associated with the users
  DELETE FROM accounts WHERE "userId" = ANY(user_ids);
  
  -- Delete all sessions associated with the users
  DELETE FROM sessions WHERE "userId" = ANY(user_ids);
  
  -- Finally, delete the users themselves
  DELETE FROM users WHERE id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION bulk_delete_users_with_items(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_delete_users_with_items(text[]) TO service_role;