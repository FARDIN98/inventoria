'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, checkUserAdminStatus } from '@/lib/utils/auth-utils';

/**
 * Get all discussion posts for a specific inventory
 * Posts are ordered chronologically (linear order) with author information
 */
export async function getDiscussionPostsAction(inventoryId) {
  try {
    const supabase = await createClient();
    
    // First check if inventory exists and is accessible
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('id, ownerId, isPublic')
      .eq('id', inventoryId)
      .single();
    
    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found', posts: [] };
    }
    
    // Check access permissions
    let user = null;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      // User not authenticated - only allow access to public inventories
      if (!inventory.isPublic) {
        return { success: false, error: 'Authentication required', posts: [] };
      }
    }
    
    const isOwner = user && user.id === inventory.ownerId;
    const isPublic = inventory.isPublic;
    
    // Check if user is admin
    let isAdmin = false;
    if (user) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      isAdmin = userRecord?.role === 'ADMIN';
    }
    
    // Allow access if inventory is public, user is owner, or user is admin
    if (!isPublic && !isOwner && !isAdmin) {
      return { success: false, error: 'Access denied', posts: [] };
    }
    
    // Fetch discussion posts with author information
    const { data: posts, error } = await supabase
      .from('discussion_posts')
      .select(`
        id,
        inventoryId,
        authorId,
        content,
        createdAt,
        updatedAt,
        author:authorId(
          id,
          name,
          email,
          image
        )
      `)
      .eq('inventoryId', inventoryId)
      .order('createdAt', { ascending: true }); // Linear order - oldest first
    
    if (error) {
      console.error('Error fetching discussion posts:', error);
      return { success: false, error: 'Failed to fetch discussion posts', posts: [] };
    }
    
    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error('Error fetching discussion posts:', error);
    return { success: false, error: 'Failed to fetch discussion posts', posts: [] };
  }
}

/**
 * Add a new discussion post to an inventory
 * Requires authentication and proper inventory access
 */
export async function addDiscussionPostAction(inventoryId, content) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Validate content
    if (!content || !content.trim()) {
      return { success: false, error: 'Post content cannot be empty' };
    }
    
    const trimmedContent = content.trim();
    
    // Validate content length (reasonable limit for discussion posts)
    if (trimmedContent.length > 10000) {
      return { success: false, error: 'Post content is too long (maximum 10,000 characters)' };
    }
    
    const supabase = await createClient();
    
    // Check if inventory exists and user has write access
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('id, ownerId, isPublic')
      .eq('id', inventoryId)
      .single();
    
    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found' };
    }
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    const isOwner = inventory.ownerId === user.id;
    const isPublic = inventory.isPublic;
    
    // Debug logging
    console.log('🔍 Add Discussion Post Permission Check:', {
      userId: user.id,
      inventoryId,
      isOwner,
      isAdmin,
      isPublic,
      inventory
    });
    
    // Allow access if: owner, admin, or authenticated user with public inventory
    if (!isOwner && !isAdmin && !isPublic) {
      console.error('❌ Permission denied for add discussion post:', { isOwner, isAdmin, isPublic });
      return { success: false, error: 'Permission denied: You can only post in your own inventories or public inventories' };
    }
    
    console.log('✅ Permission granted for add discussion post');
    
    // Create the discussion post
    const postData = {
      id: crypto.randomUUID(),
      inventoryId,
      authorId: user.id,
      content: trimmedContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const { data: post, error } = await supabase
      .from('discussion_posts')
      .insert(postData)
      .select(`
        id,
        inventoryId,
        authorId,
        content,
        createdAt,
        updatedAt,
        author:authorId(
          id,
          name,
          email,
          image
        )
      `)
      .single();
    
    if (error) {
      console.error('Database error creating discussion post:', error);
      return { success: false, error: `Failed to create discussion post: ${error.message}` };
    }
    
    // Revalidate the inventory page to show the new post
    revalidatePath(`/inventory/${inventoryId}`);
    return { success: true, post };
    
  } catch (error) {
    console.error('Error creating discussion post:', error);
    return { success: false, error: `Failed to create discussion post: ${error.message}` };
  }
}

/**
 * Delete a discussion post
 * Only inventory owner or admin can delete posts
 */
export async function deleteDiscussionPostAction(postId) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const supabase = await createClient();
    
    // Check if post exists and get inventory info
    const { data: post, error: fetchError } = await supabase
      .from('discussion_posts')
      .select(`
        id,
        inventoryId,
        authorId,
        inventory:inventoryId(
          id,
          ownerId,
          isPublic
        )
      `)
      .eq('id', postId)
      .single();
    
    if (fetchError || !post) {
      return { success: false, error: 'Discussion post not found' };
    }
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    const isInventoryOwner = post.inventory.ownerId === user.id;
    const isPostAuthor = post.authorId === user.id;
    
    // Debug logging
    console.log('🔍 Delete Discussion Post Permission Check:', {
      userId: user.id,
      postId,
      isInventoryOwner,
      isPostAuthor,
      isAdmin,
      post
    });
    
    // Allow deletion if: inventory owner, post author, or admin
    if (!isInventoryOwner && !isPostAuthor && !isAdmin) {
      console.error('❌ Permission denied for delete discussion post:', { 
        isInventoryOwner, 
        isPostAuthor, 
        isAdmin 
      });
      return { success: false, error: 'Permission denied: You can only delete your own posts or posts in your inventories' };
    }
    
    console.log('✅ Permission granted for delete discussion post');
    
    // Delete the post
    const { error: deleteError } = await supabase
      .from('discussion_posts')
      .delete()
      .eq('id', postId);
    
    if (deleteError) {
      console.error('Database error deleting discussion post:', deleteError);
      return { success: false, error: `Failed to delete discussion post: ${deleteError.message}` };
    }
    
    // Revalidate the inventory page to reflect the deletion
    revalidatePath(`/inventory/${post.inventoryId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error deleting discussion post:', error);
    return { success: false, error: `Failed to delete discussion post: ${error.message}` };
  }
}

/**
 * Update a discussion post (optional - for future use)
 * Only post author can edit their own posts
 */
export async function updateDiscussionPostAction(postId, content) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Validate content
    if (!content || !content.trim()) {
      return { success: false, error: 'Post content cannot be empty' };
    }
    
    const trimmedContent = content.trim();
    
    // Validate content length
    if (trimmedContent.length > 10000) {
      return { success: false, error: 'Post content is too long (maximum 10,000 characters)' };
    }
    
    const supabase = await createClient();
    
    // Check if post exists and user is the author
    const { data: post, error: fetchError } = await supabase
      .from('discussion_posts')
      .select('id, inventoryId, authorId')
      .eq('id', postId)
      .single();
    
    if (fetchError || !post) {
      return { success: false, error: 'Discussion post not found' };
    }
    
    // Check if user is admin or post author
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    const isPostAuthor = post.authorId === user.id;
    
    if (!isPostAuthor && !isAdmin) {
      return { success: false, error: 'Permission denied: You can only edit your own posts' };
    }
    
    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
      .from('discussion_posts')
      .update({
        content: trimmedContent,
        updatedAt: new Date().toISOString()
      })
      .eq('id', postId)
      .select(`
        id,
        inventoryId,
        authorId,
        content,
        createdAt,
        updatedAt,
        author:authorId(
          id,
          name,
          email,
          image
        )
      `)
      .single();
    
    if (updateError) {
      console.error('Database error updating discussion post:', updateError);
      return { success: false, error: `Failed to update discussion post: ${updateError.message}` };
    }
    
    // Revalidate the inventory page to show the updated post
    revalidatePath(`/inventory/${post.inventoryId}`);
    return { success: true, post: updatedPost };
    
  } catch (error) {
    console.error('Error updating discussion post:', error);
    return { success: false, error: `Failed to update discussion post: ${error.message}` };
  }
}