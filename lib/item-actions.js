'use server';

import { createClient } from '@/lib/supabase/server';
// Get authenticated user from server-side
async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Authentication required')
  }
  
  return user
};
import { revalidatePath } from 'next/cache';

// Get items for a specific inventory
export async function getInventoryItemsAction(inventoryId) {
  try {
    const supabase = await createClient();
    
    // First check if inventory exists and is accessible
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('id, ownerId, isPublic')
      .eq('id', inventoryId)
      .single();
    
    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found', items: [] };
    }
    
    // Check access permissions
    const user = await getAuthenticatedUser();
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
      return { success: false, error: 'Access denied', items: [] };
    }
    
    const { data: items, error } = await supabase
      .from('items')
      .select(`
        *,
        createdBy:createdById(name, email)
      `)
      .eq('inventoryId', inventoryId)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching items:', error);
      return { success: false, error: 'Failed to fetch items', items: [] };
    }
    
    return { success: true, items: items || [] };
  } catch (error) {
    console.error('Error fetching items:', error);
    return { success: false, error: 'Failed to fetch items', items: [] };
  }
}

// Add new item to inventory
export async function addItemAction(inventoryId, formData) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
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
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = userRecord?.role === 'ADMIN';
    const isOwner = inventory.ownerId === user.id;
    const isPublic = inventory.isPublic;
    
    // Debug logging
    console.log('🔍 Add Item Permission Check:', {
      userId: user.id,
      inventoryId,
      isOwner,
      isAdmin,
      isPublic,
      inventory
    });
    
    // Allow access if: owner, admin, or authenticated user with public inventory
    if (!isOwner && !isAdmin && !isPublic) {
      console.error('❌ Permission denied for add item:', { isOwner, isAdmin, isPublic });
      return { success: false, error: 'Permission denied: You can only add items to your own inventories or public inventories' };
    }
    
    console.log('✅ Permission granted for add item');
    
    const customId = formData.get('customId');
    
    // Validate required fields
    if (!customId || !customId.trim()) {
      return { success: false, error: 'Custom ID is required' };
    }
    
    // Check if customId already exists in this inventory
    const { data: existingItem } = await supabase
      .from('items')
      .select('id')
      .eq('inventoryId', inventoryId)
      .eq('customId', customId.trim())
      .single();
    
    if (existingItem) {
      return { success: false, error: 'An item with this Custom ID already exists in this inventory' };
    }
    
    // Extract all field values
    const itemData = {
      id: crypto.randomUUID(),
      inventoryId,
      customId: customId.trim(),
      createdById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Text fields
      text1: formData.get('text1')?.trim() || null,
      text2: formData.get('text2')?.trim() || null,
      text3: formData.get('text3')?.trim() || null,
      // Textarea fields
      textArea1: formData.get('textArea1')?.trim() || null,
      textArea2: formData.get('textArea2')?.trim() || null,
      textArea3: formData.get('textArea3')?.trim() || null,
      // Numeric fields
      num1: formData.get('num1') ? parseFloat(formData.get('num1')) : null,
      num2: formData.get('num2') ? parseFloat(formData.get('num2')) : null,
      num3: formData.get('num3') ? parseFloat(formData.get('num3')) : null,
      // Document fields
      doc1: formData.get('doc1')?.trim() || null,
      doc2: formData.get('doc2')?.trim() || null,
      doc3: formData.get('doc3')?.trim() || null,
      // Boolean fields
      bool1: formData.get('bool1') === 'true' ? true : formData.get('bool1') === 'false' ? false : null,
      bool2: formData.get('bool2') === 'true' ? true : formData.get('bool2') === 'false' ? false : null,
      bool3: formData.get('bool3') === 'true' ? true : formData.get('bool3') === 'false' ? false : null,
    };
    
    const { data: item, error } = await supabase
      .from('items')
      .insert(itemData)
      .select(`
        *,
        createdBy:createdById(name, email)
      `)
      .single();
    
    if (error) {
      console.error('Database error creating item:', error);
      return { success: false, error: `Failed to create item: ${error.message}` };
    }
    
    revalidatePath(`/inventory/${inventoryId}`);
    return { success: true, item };
    
  } catch (error) {
    console.error('Error creating item:', error);
    return { success: false, error: `Failed to create item: ${error.message}` };
  }
}

// Edit existing item with optimistic locking
export async function editItemAction(itemId, formData, currentVersion) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const supabase = await createClient();
    
    // Check if item exists and get inventory info
    const { data: item, error: fetchError } = await supabase
      .from('items')
      .select(`
        *,
        inventory:inventoryId(ownerId, isPublic)
      `)
      .eq('id', itemId)
      .single();
    
    if (fetchError || !item) {
      return { success: false, error: 'Item not found' };
    }
    
    // Check if user is admin
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = userRecord?.role === 'ADMIN';
    const isOwner = item.inventory.ownerId === user.id;
    const isPublic = item.inventory.isPublic;
    
    // Debug logging
    console.log('🔍 Edit Item Permission Check:', {
      userId: user.id,
      itemId,
      isOwner,
      isAdmin,
      isPublic,
      inventory: item.inventory
    });
    
    // Allow access if: owner, admin, or authenticated user with public inventory
    if (!isOwner && !isAdmin && !isPublic) {
      console.error('❌ Permission denied for edit item:', { isOwner, isAdmin, isPublic });
      return { success: false, error: 'Permission denied: You can only edit items in your own inventories or public inventories' };
    }
    
    console.log('✅ Permission granted for edit item');
    
    // Optimistic locking check
    if (item.version !== currentVersion) {
      return { success: false, error: 'Item has been modified by another user. Please refresh and try again.' };
    }
    
    const customId = formData.get('customId');
    
    // Validate required fields
    if (!customId || !customId.trim()) {
      return { success: false, error: 'Custom ID is required' };
    }
    
    // Check if customId already exists in this inventory (excluding current item)
    const { data: existingItem } = await supabase
      .from('items')
      .select('id')
      .eq('inventoryId', item.inventoryId)
      .eq('customId', customId.trim())
      .neq('id', itemId)
      .single();
    
    if (existingItem) {
      return { success: false, error: 'An item with this Custom ID already exists in this inventory' };
    }
    
    // Extract all field values
    const updateData = {
      customId: customId.trim(),
      updatedAt: new Date().toISOString(),
      version: (item.version || 0) + 1,
      // Text fields
      text1: formData.get('text1')?.trim() || null,
      text2: formData.get('text2')?.trim() || null,
      text3: formData.get('text3')?.trim() || null,
      // Textarea fields
      textArea1: formData.get('textArea1')?.trim() || null,
      textArea2: formData.get('textArea2')?.trim() || null,
      textArea3: formData.get('textArea3')?.trim() || null,
      // Numeric fields
      num1: formData.get('num1') ? parseFloat(formData.get('num1')) : null,
      num2: formData.get('num2') ? parseFloat(formData.get('num2')) : null,
      num3: formData.get('num3') ? parseFloat(formData.get('num3')) : null,
      // Document fields
      doc1: formData.get('doc1')?.trim() || null,
      doc2: formData.get('doc2')?.trim() || null,
      doc3: formData.get('doc3')?.trim() || null,
      // Boolean fields
      bool1: formData.get('bool1') === 'true' ? true : formData.get('bool1') === 'false' ? false : null,
      bool2: formData.get('bool2') === 'true' ? true : formData.get('bool2') === 'false' ? false : null,
      bool3: formData.get('bool3') === 'true' ? true : formData.get('bool3') === 'false' ? false : null,
    };
    
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', itemId)
      .eq('version', currentVersion) // Ensure version hasn't changed
      .select(`
        *,
        createdBy:createdById(name, email)
      `)
      .single();
    
    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return { success: false, error: 'Item has been modified by another user. Please refresh and try again.' };
      }
      console.error('Database error updating item:', updateError);
      return { success: false, error: `Failed to update item: ${updateError.message}` };
    }
    
    revalidatePath(`/inventory/${item.inventoryId}`);
    return { success: true, item: updatedItem };
    
  } catch (error) {
    console.error('Error updating item:', error);
    return { success: false, error: `Failed to update item: ${error.message}` };
  }
}

// Delete item with permission check
export async function deleteItemAction(itemId) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const supabase = await createClient();
    
    // Check if item exists and get inventory info
    const { data: item, error: fetchError } = await supabase
      .from('items')
      .select(`
        id,
        inventoryId,
        inventory:inventoryId(ownerId, isPublic)
      `)
      .eq('id', itemId)
      .single();
    
    if (fetchError || !item) {
      return { success: false, error: 'Item not found' };
    }
    
    // Check if user is admin
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = userRecord?.role === 'ADMIN';
    const isOwner = item.inventory.ownerId === user.id;
    const isPublic = item.inventory.isPublic;
    
    // Debug logging
    console.log('🔍 Delete Item Permission Check:', {
      userId: user.id,
      itemId,
      isOwner,
      isAdmin,
      isPublic,
      inventory: item.inventory
    });
    
    // Allow access if: owner, admin, or authenticated user with public inventory
    if (!isOwner && !isAdmin && !isPublic) {
      console.error('❌ Permission denied for delete item:', { isOwner, isAdmin, isPublic });
      return { success: false, error: 'Permission denied: You can only delete items in your own inventories or public inventories' };
    }
    
    console.log('✅ Permission granted for delete item');
    
    // Delete item
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);
    
    if (deleteError) {
      console.error('Database error deleting item:', deleteError);
      return { success: false, error: `Failed to delete item: ${deleteError.message}` };
    }
    
    revalidatePath(`/inventory/${item.inventoryId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, error: `Failed to delete item: ${error.message}` };
  }
}

// Get single item by ID
export async function getItemByIdAction(itemId) {
  try {
    const supabase = await createClient();
    
    const { data: item, error } = await supabase
      .from('items')
      .select(`
        *,
        createdBy:createdById(name, email),
        inventory:inventoryId(id, title, ownerId, isPublic)
      `)
      .eq('id', itemId)
      .single();
    
    if (error) {
      console.error('Error fetching item:', error);
      return { success: false, error: 'Item not found' };
    }
    
    // Check access permissions
    const user = await getAuthenticatedUser();
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
    
    return { success: true, item };
  } catch (error) {
    console.error('Error fetching item:', error);
    return { success: false, error: 'Failed to fetch item' };
  }
}