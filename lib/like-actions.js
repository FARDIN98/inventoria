'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, checkUserAdminStatus } from '@/lib/utils/auth-utils';

/**
 * Toggle like status for an item (like/unlike)
 * Requires authentication and proper item access
 */
export async function toggleItemLikeAction(itemId) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    // Validate itemId
    if (!itemId || !itemId.trim()) {
      return { success: false, error: 'Item ID is required' };
    }
    
    const supabase = await createClient();
    
    // First check if item exists and is accessible
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select(`
        id,
        inventoryId,
        inventory:inventoryId(
          id,
          ownerId,
          isPublic
        )
      `)
      .eq('id', itemId)
      .single();
    
    if (itemError || !item) {
      return { success: false, error: 'Item not found' };
    }
    
    // Check access permissions
    const isOwner = item.inventory.ownerId === user.id;
    const isPublic = item.inventory.isPublic;
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    
    // Debug logging
    console.log('🔍 Toggle Like Permission Check:', {
      userId: user.id,
      itemId,
      isOwner,
      isAdmin,
      isPublic,
      inventory: item.inventory
    });
    
    // Allow access if: owner, admin, or authenticated user with public inventory
    if (!isOwner && !isAdmin && !isPublic) {
      console.error('❌ Permission denied for toggle like:', { isOwner, isAdmin, isPublic });
      return { success: false, error: 'Permission denied: You can only like items in accessible inventories' };
    }
    
    console.log('✅ Permission granted for toggle like');
    
    // Check if user already liked this item
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('likes')
      .select('id')
      .eq('itemId', itemId)
      .eq('userId', user.id)
      .single();
    
    let action;
    let likeData;
    
    if (existingLike) {
      // User already liked - remove the like (unlike)
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
      
      if (deleteError) {
        console.error('Database error removing like:', deleteError);
        return { success: false, error: `Failed to remove like: ${deleteError.message}` };
      }
      
      action = 'unliked';
    } else {
      // User hasn't liked - add the like
      const likeRecord = {
        id: crypto.randomUUID(),
        itemId,
        userId: user.id,
        likedAt: new Date().toISOString()
      };
      
      const { data: newLike, error: insertError } = await supabase
        .from('likes')
        .insert(likeRecord)
        .select('*')
        .single();
      
      if (insertError) {
        console.error('Database error creating like:', insertError);
        return { success: false, error: `Failed to create like: ${insertError.message}` };
      }
      
      action = 'liked';
      likeData = newLike;
    }
    
    // Get updated like count
    const { count: likeCount, error: countError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('itemId', itemId);
    
    if (countError) {
      console.error('Error getting like count:', countError);
      // Don't fail the operation, just log the error
    }
    
    // Revalidate the inventory page to show updated like status
    revalidatePath(`/inventory/${item.inventoryId}`);
    
    return {
      success: true,
      action,
      likeCount: likeCount || 0,
      isLiked: action === 'liked',
      like: likeData
    };
    
  } catch (error) {
    console.error('Error toggling item like:', error);
    return { success: false, error: `Failed to toggle like: ${error.message}` };
  }
}

/**
 * Get like status and count for an item
 * Works for both authenticated and unauthenticated users
 */
export async function getItemLikeStatusAction(itemId) {
  try {
    // Validate itemId
    if (!itemId || !itemId.trim()) {
      return { success: false, error: 'Item ID is required' };
    }
    
    const supabase = await createClient();
    
    // First check if item exists
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select(`
        id,
        inventoryId,
        inventory:inventoryId(
          id,
          ownerId,
          isPublic
        )
      `)
      .eq('id', itemId)
      .single();
    
    if (itemError || !item) {
      return { success: false, error: 'Item not found' };
    }
    
    // Check access permissions (allow unauthenticated users for public inventories)
    let user = null;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      // User not authenticated - only allow access to public inventories
      if (!item.inventory.isPublic) {
        return { success: false, error: 'Authentication required' };
      }
    }
    
    const isOwner = user && user.id === item.inventory.ownerId;
    const isPublic = item.inventory.isPublic;
    
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
      return { success: false, error: 'Access denied' };
    }
    
    // Get total like count for the item
    const { count: likeCount, error: countError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('itemId', itemId);
    
    if (countError) {
      console.error('Error getting like count:', countError);
      return { success: false, error: 'Failed to get like count' };
    }
    
    // Check if current user liked this item (only if authenticated)
    let isLiked = false;
    if (user) {
      const { data: userLike, error: userLikeError } = await supabase
        .from('likes')
        .select('id')
        .eq('itemId', itemId)
        .eq('userId', user.id)
        .single();
      
      if (userLikeError && userLikeError.code !== 'PGRST116') {
        console.error('Error checking user like status:', userLikeError);
        // Don't fail the operation, just log the error
      }
      
      isLiked = !!userLike;
    }
    
    return {
      success: true,
      likeCount: likeCount || 0,
      isLiked,
      itemId
    };
    
  } catch (error) {
    console.error('Error getting item like status:', error);
    return { success: false, error: `Failed to get like status: ${error.message}` };
  }
}

/**
 * Get likes for multiple items (batch operation)
 * Useful for displaying like counts in item lists
 */
export async function getMultipleItemsLikeStatusAction(itemIds) {
  try {
    // Validate itemIds
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return { success: false, error: 'Item IDs array is required' };
    }
    
    // Limit batch size to prevent performance issues
    if (itemIds.length > 100) {
      return { success: false, error: 'Too many items requested (maximum 100)' };
    }
    
    const supabase = await createClient();
    
    // Get user if authenticated
    let user = null;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      // User not authenticated - continue with public data only
    }
    
    // Get like counts for all items
    const { data: likeCounts, error: countError } = await supabase
      .from('likes')
      .select('itemId')
      .in('itemId', itemIds);
    
    if (countError) {
      console.error('Error getting like counts:', countError);
      return { success: false, error: 'Failed to get like counts' };
    }
    
    // Count likes per item
    const likeCountMap = {};
    itemIds.forEach(itemId => {
      likeCountMap[itemId] = 0;
    });
    
    likeCounts.forEach(like => {
      likeCountMap[like.itemId] = (likeCountMap[like.itemId] || 0) + 1;
    });
    
    // Get user's likes if authenticated
    let userLikes = [];
    if (user) {
      const { data: userLikesData, error: userLikesError } = await supabase
        .from('likes')
        .select('itemId')
        .eq('userId', user.id)
        .in('itemId', itemIds);
      
      if (userLikesError) {
        console.error('Error getting user likes:', userLikesError);
        // Don't fail the operation, just log the error
      } else {
        userLikes = userLikesData || [];
      }
    }
    
    // Build result map
    const result = {};
    itemIds.forEach(itemId => {
      result[itemId] = {
        likeCount: likeCountMap[itemId] || 0,
        isLiked: user ? userLikes.some(like => like.itemId === itemId) : false
      };
    });
    
    return {
      success: true,
      items: result
    };
    
  } catch (error) {
    console.error('Error getting multiple items like status:', error);
    return { success: false, error: `Failed to get like status: ${error.message}` };
  }
}