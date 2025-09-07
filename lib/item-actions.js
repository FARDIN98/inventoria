'use server';

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser, checkUserAdminStatus } from '@/lib/utils/auth-utils'
import { getCurrentUserServer } from '@/lib/auth-actions';
import { generateCustomIdAction as generateCustomId, validateCustomIdAction as validateCustomId, parseIdFormatAction as parseIdFormat, customIdExistsAction as customIdExists, generateUniqueCustomIdAction as generateUniqueCustomId } from '@/lib/utils/custom-id-server-actions';
import { 
  mapFieldValuesToItem, 
  getFieldColumnName 
} from '@/lib/utils/custom-fields-utils';
import { validateFieldData } from '@/lib/utils/field-validation-utils';
import { getInventoryFieldTemplatesAction } from '@/lib/field-actions';

// Validate custom ID uniqueness within an inventory
export async function validateCustomIdUniqueness(inventoryId, customId, excludeItemId = null) {
  try {
    console.log('🔍 Validating custom ID uniqueness:', { inventoryId, customId: customId.trim(), excludeItemId });
    
    const exists = await customIdExists(customId.trim(), inventoryId, excludeItemId);
    const isUnique = !exists;
    
    console.log('✅ Custom ID uniqueness result:', { customId: customId.trim(), exists, isUnique });
    
    return isUnique; // Return true if unique (no existing item found)
  } catch (error) {
    console.error('❌ Error checking custom ID uniqueness:', error);
    throw error;
  }
}

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
    
    // Check access permissions - use getCurrentUserServer to handle non-authenticated users
    const { user } = await getCurrentUserServer();
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
    console.log('🚀 Starting addItemAction:', { inventoryId, formDataKeys: Array.from(formData.keys()) });
    
    const user = await getAuthenticatedUser();
    
    if (!user) {
      console.error('❌ Authentication failed');
      return { success: false, error: 'Authentication required' };
    }
    
    console.log('✅ User authenticated:', { userId: user.id });
    
    const supabase = await createClient();
    
    // Check if inventory exists and user has write access
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('id, ownerId, isPublic, customIdFormat')
      .eq('id', inventoryId)
      .single();
    
    if (inventoryError || !inventory) {
      console.error('❌ Inventory not found:', inventoryError);
      return { success: false, error: 'Inventory not found' };
    }
    
    console.log('✅ Inventory found:', inventory);
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
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
    
    // Handle custom ID - prioritize manual input over auto-generation
    let customId;
    const manualCustomId = formData.get('customId')?.trim();
    
    console.log('🔧 Starting custom ID processing:', { 
      hasCustomIdFormat: !!inventory.customIdFormat,
      manualCustomId: manualCustomId || 'none provided'
    });
    
    if (manualCustomId) {
      // User provided a manual custom ID - use it regardless of format settings
      customId = manualCustomId;
      console.log('📝 Using manual custom ID from user input:', customId);
      
      // Validate custom ID against inventory format if format exists
      if (inventory.customIdFormat) {
        try {
          const parsedFormat = await parseIdFormat(inventory.customIdFormat);
          const isValid = await validateCustomId(customId, parsedFormat);
          if (!isValid) {
            console.error('❌ Manual custom ID does not match required format');
            return { success: false, error: 'Custom ID format does not match the required pattern for this inventory' };
          }
          console.log('✅ Manual custom ID matches required format');
        } catch (error) {
          console.error('❌ Error validating custom ID format:', error);
          return { success: false, error: `Failed to validate custom ID format: ${error.message}` };
        }
      }
      
      // Check uniqueness for manual custom ID
      const isUnique = await validateCustomIdUniqueness(inventoryId, customId);
      console.log('🔍 Manual custom ID uniqueness check:', { customId, isUnique });
      
      if (!isUnique) {
        console.error('❌ Custom ID already exists:', customId);
        return { success: false, error: 'Custom ID already exists. Create new' };
      }
      
    } else if (inventory.customIdFormat) {
      // No manual input provided and inventory has auto-generation format
      try {
        console.log('📋 Auto-generating custom ID using format:', inventory.customIdFormat);
        const parsedFormat = await parseIdFormat(inventory.customIdFormat);
        console.log('✅ Parsed format:', parsedFormat);
        
        // Generate unique custom ID using the improved function
        customId = await generateUniqueCustomId(parsedFormat, inventoryId, 10);
        console.log('✅ Unique custom ID auto-generated:', customId);
        
      } catch (error) {
        console.error('❌ Error generating custom ID:', error);
        return { success: false, error: `Failed to generate custom ID: ${error.message}` };
      }
    } else {
      // No manual input and no auto-generation format - require manual input
      console.error('❌ Custom ID is required but not provided');
      return { success: false, error: 'Custom ID is required' };
    }
    
    // Get field templates for this inventory
    const { success: templatesSuccess, fieldTemplates } = await getInventoryFieldTemplatesAction(inventoryId);
    
    if (!templatesSuccess) {
      console.warn('Could not fetch field templates, using legacy field extraction');
    }
    
    // Extract and validate custom field values using field templates
    const itemData = {
      id: crypto.randomUUID(),
      inventoryId,
      customId: customId,
      createdById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Handle custom fields if templates are available
    if (templatesSuccess && fieldTemplates && fieldTemplates.length > 0) {
      try {
        // Create field values object from form data
        const fieldValues = {};
        
        for (const template of fieldTemplates) {
          const fieldKey = `field_${template.id}`;
          const formValue = formData.get(fieldKey);
          
          // Validate field data
          const isValid = await validateFieldData(template.fieldType, formValue);
          if (!isValid && formValue !== null && formValue !== undefined && formValue !== '') {
            return { success: false, error: `Invalid value for field "${template.title}": ${formValue}` };
          }
          
          fieldValues[template.id] = formValue;
        }
        
        // Map field values to database columns
        const customFieldData = await mapFieldValuesToItem(fieldValues, fieldTemplates);
        Object.assign(itemData, customFieldData);
        
      } catch (error) {
        console.error('Error processing custom fields:', error);
        return { success: false, error: `Failed to process custom fields: ${error.message}` };
      }
    } else {
      // Fallback to legacy field extraction for backward compatibility
      Object.assign(itemData, {
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
      });
    }
    
    console.log('💾 Inserting item into database:', itemData);
    
    const { data: item, error } = await supabase
      .from('items')
      .insert(itemData)
      .select(`
        *,
        createdBy:createdById(name, email)
      `)
      .single();
    
    if (error) {
      console.error('❌ Database error creating item:', error);
      console.error('❌ Item data that failed to insert:', itemData);
      return { success: false, error: `Failed to create item: ${error.message}` };
    }
    
    console.log('✅ Item successfully created in database:', item);
    
    revalidatePath(`/inventory/${inventoryId}`);
    console.log('✅ Path revalidated for inventory:', inventoryId);
    
    return { success: true, item };
    
  } catch (error) {
    console.error('❌ Unexpected error in addItemAction:', error);
    console.error('❌ Error stack:', error.stack);
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
        inventory:inventoryId(ownerId, isPublic, customIdFormat)
      `)
      .eq('id', itemId)
      .single();
    
    if (fetchError || !item) {
      return { success: false, error: 'Item not found' };
    }
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
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
    
    const trimmedCustomId = customId.trim();
    
    // Validate custom ID against inventory format if format exists
    if (item.inventory.customIdFormat) {
      try {
        const parsedFormat = await parseIdFormat(item.inventory.customIdFormat);
        const isValid = await validateCustomId(trimmedCustomId, parsedFormat);
        
        if (!isValid) {
          return { success: false, error: 'Custom ID does not match the required format for this inventory' };
        }
      } catch (error) {
        console.error('Error validating custom ID format:', error);
        return { success: false, error: `Invalid custom ID format: ${error.message}` };
      }
    }
    
    // Check uniqueness (excluding current item)
    if (!(await validateCustomIdUniqueness(item.inventoryId, trimmedCustomId, itemId))) {
      return { success: false, error: 'Custom ID already exists. Create new' };
    }
    
    // Get field templates for this inventory
    const { success: templatesSuccess, fieldTemplates } = await getInventoryFieldTemplatesAction(item.inventoryId);
    
    if (!templatesSuccess) {
      console.warn('Could not fetch field templates, using legacy field extraction');
    }
    
    // Extract and validate custom field values using field templates
    const updateData = {
      customId: trimmedCustomId,
      updatedAt: new Date().toISOString(),
      version: (item.version || 0) + 1,
    };
    
    // Handle custom fields if templates are available
    if (templatesSuccess && fieldTemplates && fieldTemplates.length > 0) {
      try {
        // Create field values object from form data
        const fieldValues = {};
        
        for (const template of fieldTemplates) {
          const fieldKey = `field_${template.id}`;
          const formValue = formData.get(fieldKey);
          
          // Validate field data
          const isValid = await validateFieldData(template.fieldType, formValue);
          if (!isValid && formValue !== null && formValue !== undefined && formValue !== '') {
            return { success: false, error: `Invalid value for field "${template.title}": ${formValue}` };
          }
          
          fieldValues[template.id] = formValue;
        }
        
        // Map field values to database columns
        const customFieldData = await mapFieldValuesToItem(fieldValues, fieldTemplates);
        Object.assign(updateData, customFieldData);
        
      } catch (error) {
        console.error('Error processing custom fields:', error);
        return { success: false, error: `Failed to process custom fields: ${error.message}` };
      }
    } else {
      // Fallback to legacy field extraction for backward compatibility
      Object.assign(updateData, {
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
      });
    }
    
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

// Bulk delete items with permission check
export async function bulkDeleteItemsAction(itemIds) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    if (!itemIds || itemIds.length === 0) {
      return { success: false, error: 'No items selected for deletion' };
    }
    
    const supabase = await createClient();
    
    // Check if all items exist and get inventory info
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select(`
        id,
        inventoryId,
        inventory:inventoryId(ownerId, isPublic)
      `)
      .in('id', itemIds);
    
    if (fetchError || !items || items.length === 0) {
      return { success: false, error: 'Items not found' };
    }
    
    // Check if user is admin
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = userRecord?.role === 'ADMIN';
    
    // Check permissions for each item
    const unauthorizedItems = [];
    const inventoryIds = new Set();
    
    for (const item of items) {
      const isOwner = item.inventory.ownerId === user.id;
      const isPublic = item.inventory.isPublic;
      
      if (!isOwner && !isAdmin && !isPublic) {
        unauthorizedItems.push(item.id);
      } else {
        inventoryIds.add(item.inventoryId);
      }
    }
    
    if (unauthorizedItems.length > 0) {
      console.error('❌ Permission denied for bulk delete items:', unauthorizedItems);
      return { 
        success: false, 
        error: `Permission denied: You can only delete items in your own inventories or public inventories. ${unauthorizedItems.length} items were unauthorized.` 
      };
    }
    
    console.log('✅ Permission granted for bulk delete items:', itemIds);
    
    // Delete all items
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .in('id', itemIds);
    
    if (deleteError) {
      console.error('Database error bulk deleting items:', deleteError);
      return { success: false, error: `Failed to delete items: ${deleteError.message}` };
    }
    
    // Revalidate all affected inventory pages
    for (const inventoryId of inventoryIds) {
      revalidatePath(`/inventory/${inventoryId}`);
    }
    
    return { 
      success: true, 
      deletedCount: itemIds.length,
      message: `Successfully deleted ${itemIds.length} item${itemIds.length > 1 ? 's' : ''}` 
    };
    
  } catch (error) {
    console.error('Error in bulkDeleteItemsAction:', error);
    return { success: false, error: 'Failed to delete items' };
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