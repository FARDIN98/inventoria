'use server';

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser, checkUserAdminStatus } from '@/lib/utils/auth-utils'
import { getCurrentUserServer } from '@/lib/auth-actions';
import { 
  parseFieldTemplates, 
  FIELD_TYPES, 
  MAX_FIELDS_PER_TYPE 
} from '@/lib/utils/custom-fields-utils';
import { validateFieldData } from '@/lib/utils/field-validation-utils';

/**
 * Get all field templates for an inventory with proper ordering
 * @param {string} inventoryId - ID of the inventory
 * @returns {Promise<Object>} Result with field templates or error
 */
export async function getInventoryFieldTemplatesAction(inventoryId) {
  try {
    const supabase = await createClient();
    
    // Check if inventory exists and is accessible
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('id, ownerId, isPublic')
      .eq('id', inventoryId)
      .single();
    
    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found', fieldTemplates: [] };
    }
    
    // Check access permissions - use getCurrentUserServer to handle non-authenticated users
    const { user } = await getCurrentUserServer();
    const isOwner = user && user.id === inventory.ownerId;
    const isPublic = inventory.isPublic;
    
    // Check if user is admin
    let isAdmin = false;
    if (user) {
      const { isAdmin: adminStatus } = await checkUserAdminStatus(user.id, supabase);
      isAdmin = adminStatus;
    }
    
    // Allow access if inventory is public, user is owner, or user is admin
    if (!isPublic && !isOwner && !isAdmin) {
      return { success: false, error: 'Access denied', fieldTemplates: [] };
    }
    
    const { data: fieldTemplates, error } = await supabase
      .from('field_templates')
      .select('*')
      .eq('inventoryId', inventoryId)
      .order('displayOrder', { ascending: true })
      .order('fieldIndex', { ascending: true });
    
    if (error) {
      console.error('Error fetching field templates:', error);
      return { success: false, error: 'Failed to fetch field templates', fieldTemplates: [] };
    }
    
    return { success: true, fieldTemplates: fieldTemplates || [] };
  } catch (error) {
    console.error('Error fetching field templates:', error);
    return { success: false, error: 'Failed to fetch field templates', fieldTemplates: [] };
  }
}

/**
 * Add new field template with validation
 * @param {string} inventoryId - ID of the inventory
 * @param {Object} fieldData - Field template data
 * @returns {Promise<Object>} Result with created template or error
 */
export async function addFieldTemplateAction(inventoryId, fieldData) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const supabase = await createClient();
    
    // Check if inventory exists and user has permission
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('id, ownerId, version')
      .eq('id', inventoryId)
      .single();
    
    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found' };
    }
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    const isOwner = inventory.ownerId === user.id;
    
    // Only owner or admin can modify field templates
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied: Only the owner or admin can modify field templates' };
    }
    
    // Validate required fields
    if (!fieldData.fieldType || !Object.values(FIELD_TYPES).includes(fieldData.fieldType)) {
      return { success: false, error: 'Valid field type is required' };
    }
    
    if (!fieldData.fieldIndex || fieldData.fieldIndex < 1 || fieldData.fieldIndex > MAX_FIELDS_PER_TYPE) {
      return { success: false, error: `Field index must be between 1 and ${MAX_FIELDS_PER_TYPE}` };
    }
    
    if (!fieldData.title || !fieldData.title.trim()) {
      return { success: false, error: 'Field title is required' };
    }
    
    // Get existing field templates to validate limits and uniqueness
    const { data: existingTemplates, error: fetchError } = await supabase
      .from('field_templates')
      .select('*')
      .eq('inventoryId', inventoryId);
    
    if (fetchError) {
      console.error('Error fetching existing templates:', fetchError);
      return { success: false, error: 'Failed to validate field templates' };
    }
    
    // Check field type limits (max 3 per type)
    const sameTypeTemplates = existingTemplates.filter(t => t.fieldType === fieldData.fieldType);
    if (sameTypeTemplates.length >= MAX_FIELDS_PER_TYPE) {
      return { success: false, error: `Maximum ${MAX_FIELDS_PER_TYPE} fields allowed per type` };
    }
    
    // Check for duplicate field index within the same type
    const duplicateIndex = sameTypeTemplates.find(t => t.fieldIndex === fieldData.fieldIndex);
    if (duplicateIndex) {
      return { success: false, error: `Field index ${fieldData.fieldIndex} is already used for ${fieldData.fieldType} type` };
    }
    
    // Set display order (next available order)
    const maxDisplayOrder = existingTemplates.length > 0 
      ? Math.max(...existingTemplates.map(t => t.displayOrder || 0))
      : -1;
    
    const templateData = {
      id: crypto.randomUUID(),
      inventoryId,
      fieldType: fieldData.fieldType,
      fieldIndex: fieldData.fieldIndex,
      title: fieldData.title.trim(),
      description: fieldData.description?.trim() || null,
      isVisible: fieldData.isVisible !== undefined ? fieldData.isVisible : true,
      displayOrder: maxDisplayOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const { data: template, error } = await supabase
      .from('field_templates')
      .insert(templateData)
      .select()
      .single();
    
    if (error) {
      console.error('Database error creating field template:', error);
      return { success: false, error: `Failed to create field template: ${error.message}` };
    }
    
    // Update inventory version for optimistic locking
    await supabase
      .from('inventories')
      .update({ 
        version: (inventory.version || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', inventoryId);
    
    revalidatePath(`/inventory/${inventoryId}`);
    return { success: true, template };
    
  } catch (error) {
    console.error('Error creating field template:', error);
    return { success: false, error: `Failed to create field template: ${error.message}` };
  }
}

/**
 * Edit field template with ownership validation
 * @param {string} templateId - ID of the field template
 * @param {Object} fieldData - Updated field data
 * @returns {Promise<Object>} Result with updated template or error
 */
export async function editFieldTemplateAction(templateId, fieldData) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const supabase = await createClient();
    
    // Check if template exists and get inventory info
    const { data: template, error: fetchError } = await supabase
      .from('field_templates')
      .select(`
        *,
        inventory:inventoryId(ownerId, version)
      `)
      .eq('id', templateId)
      .single();
    
    if (fetchError || !template) {
      return { success: false, error: 'Field template not found' };
    }
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    const isOwner = template.inventory.ownerId === user.id;
    
    // Only owner or admin can modify field templates
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied: Only the owner or admin can modify field templates' };
    }
    
    // Validate title if provided
    if (fieldData.title !== undefined) {
      if (!fieldData.title || !fieldData.title.trim()) {
        return { success: false, error: 'Field title is required' };
      }
    }
    
    // Prepare update data (only allow certain fields to be updated)
    const updateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (fieldData.title !== undefined) {
      updateData.title = fieldData.title.trim();
    }
    
    if (fieldData.description !== undefined) {
      updateData.description = fieldData.description?.trim() || null;
    }
    
    if (fieldData.isVisible !== undefined) {
      updateData.isVisible = fieldData.isVisible;
    }
    
    if (fieldData.displayOrder !== undefined) {
      updateData.displayOrder = fieldData.displayOrder;
    }
    
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('field_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Database error updating field template:', updateError);
      return { success: false, error: `Failed to update field template: ${updateError.message}` };
    }
    
    // Update inventory version for optimistic locking
    await supabase
      .from('inventories')
      .update({ 
        version: (template.inventory.version || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', template.inventoryId);
    
    revalidatePath(`/inventory/${template.inventoryId}`);
    return { success: true, template: updatedTemplate };
    
  } catch (error) {
    console.error('Error updating field template:', error);
    return { success: false, error: `Failed to update field template: ${error.message}` };
  }
}

/**
 * Delete field template with permission checks
 * @param {string} templateId - ID of the field template
 * @returns {Promise<Object>} Result with success status or error
 */
export async function deleteFieldTemplateAction(templateId) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const supabase = await createClient();
    
    // Check if template exists and get inventory info
    const { data: template, error: fetchError } = await supabase
      .from('field_templates')
      .select(`
        *,
        inventory:inventoryId(ownerId, version)
      `)
      .eq('id', templateId)
      .single();
    
    if (fetchError || !template) {
      return { success: false, error: 'Field template not found' };
    }
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    const isOwner = template.inventory.ownerId === user.id;
    
    // Only owner or admin can delete field templates
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied: Only the owner or admin can delete field templates' };
    }
    
    // Delete field template (data in Items table remains intact)
    const { error: deleteError } = await supabase
      .from('field_templates')
      .delete()
      .eq('id', templateId);
    
    if (deleteError) {
      console.error('Database error deleting field template:', deleteError);
      return { success: false, error: `Failed to delete field template: ${deleteError.message}` };
    }
    
    // Update inventory version for optimistic locking
    await supabase
      .from('inventories')
      .update({ 
        version: (template.inventory.version || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', template.inventoryId);
    
    revalidatePath(`/inventory/${template.inventoryId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error deleting field template:', error);
    return { success: false, error: `Failed to delete field template: ${error.message}` };
  }
}

/**
 * Bulk save field templates (create, update, delete operations)
 * @param {string} inventoryId - ID of the inventory
 * @param {Array} fieldTemplates - Array of field template data
 * @returns {Promise<Object>} Result with success status or error
 */
export async function bulkSaveFieldTemplatesAction(inventoryId, fieldTemplates) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const supabase = await createClient();
    
    // Check if inventory exists and user has permission
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('id, ownerId, version')
      .eq('id', inventoryId)
      .single();
    
    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found' };
    }
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    const isOwner = inventory.ownerId === user.id;
    
    // Only owner or admin can modify field templates
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied: Only the owner or admin can modify field templates' };
    }
    
    // Validate field templates
    const validationErrors = [];
    const fieldTypeCounts = {};
    
    for (let i = 0; i < fieldTemplates.length; i++) {
      const field = fieldTemplates[i];
      
      // Validate required fields
      if (!field.fieldType || !Object.values(FIELD_TYPES).includes(field.fieldType)) {
        validationErrors.push(`Field ${i + 1}: Valid field type is required`);
        continue;
      }
      
      if (!field.fieldIndex || field.fieldIndex < 1 || field.fieldIndex > MAX_FIELDS_PER_TYPE) {
        validationErrors.push(`Field ${i + 1}: Field index must be between 1 and ${MAX_FIELDS_PER_TYPE}`);
        continue;
      }
      
      if (!field.title || !field.title.trim()) {
        validationErrors.push(`Field ${i + 1}: Field title is required`);
        continue;
      }
      
      // Count field types
      fieldTypeCounts[field.fieldType] = (fieldTypeCounts[field.fieldType] || 0) + 1;
    }
    
    // Check field type limits
    for (const [fieldType, count] of Object.entries(fieldTypeCounts)) {
      if (count > MAX_FIELDS_PER_TYPE) {
        validationErrors.push(`Maximum ${MAX_FIELDS_PER_TYPE} fields allowed for ${fieldType} type`);
      }
    }
    
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors.join('; ') };
    }
    
    // Delete all existing field templates for this inventory
    const { error: deleteError } = await supabase
      .from('field_templates')
      .delete()
      .eq('inventoryId', inventoryId);
    
    if (deleteError) {
      console.error('Error deleting existing templates:', deleteError);
      return { success: false, error: 'Failed to clear existing field templates' };
    }
    
    // Insert new field templates
    if (fieldTemplates.length > 0) {
      const templateData = fieldTemplates.map((field, index) => ({
        id: field.id || crypto.randomUUID(),
        inventoryId,
        fieldType: field.fieldType,
        fieldIndex: field.fieldIndex,
        title: field.title.trim(),
        description: field.description?.trim() || null,
        isVisible: field.isVisible !== undefined ? field.isVisible : true,
        displayOrder: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('field_templates')
        .insert(templateData);
      
      if (insertError) {
        console.error('Error inserting field templates:', insertError);
        return { success: false, error: 'Failed to save field templates' };
      }
    }
    
    // Update inventory version
    await supabase
      .from('inventories')
      .update({ 
        version: (inventory.version || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', inventoryId);
    
    revalidatePath(`/inventory/${inventoryId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error bulk saving field templates:', error);
    return { success: false, error: `Failed to save field templates: ${error.message}` };
  }
}

/**
 * Reorder field templates with optimistic locking
 * @param {string} inventoryId - ID of the inventory
 * @param {Array} newOrder - Array of template IDs in new order
 * @param {number} currentVersion - Current inventory version for optimistic locking
 * @returns {Promise<Object>} Result with success status or error
 */
export async function reorderFieldTemplatesAction(inventoryId, newOrder, currentVersion) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }
    
    const supabase = await createClient();
    
    // Check if inventory exists and user has permission
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .select('id, ownerId, version')
      .eq('id', inventoryId)
      .single();
    
    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found' };
    }
    
    // Check if user is admin
    const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
    const isOwner = inventory.ownerId === user.id;
    
    // Only owner or admin can reorder field templates
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Permission denied: Only the owner or admin can reorder field templates' };
    }
    
    // Optimistic locking check
    if (inventory.version !== currentVersion) {
      return { success: false, error: 'Inventory has been modified by another user. Please refresh and try again.' };
    }
    
    // Validate newOrder array
    if (!Array.isArray(newOrder)) {
      return { success: false, error: 'New order must be an array' };
    }
    
    // Get existing templates to validate the reorder
    const { data: existingTemplates, error: fetchError } = await supabase
      .from('field_templates')
      .select('id')
      .eq('inventoryId', inventoryId);
    
    if (fetchError) {
      console.error('Error fetching existing templates:', fetchError);
      return { success: false, error: 'Failed to validate field templates' };
    }
    
    const existingIds = existingTemplates.map(t => t.id);
    
    // Validate that all template IDs in newOrder exist and belong to this inventory
    for (const templateId of newOrder) {
      if (!existingIds.includes(templateId)) {
        return { success: false, error: `Invalid template ID: ${templateId}` };
      }
    }
    
    // Validate that all existing templates are included in newOrder
    if (newOrder.length !== existingIds.length || !existingIds.every(id => newOrder.includes(id))) {
      return { success: false, error: 'New order must include all existing templates' };
    }
    
    // Update display order for each template
    const updatePromises = newOrder.map((templateId, index) => 
      supabase
        .from('field_templates')
        .update({ 
          displayOrder: index,
          updatedAt: new Date().toISOString()
        })
        .eq('id', templateId)
    );
    
    const results = await Promise.all(updatePromises);
    
    // Check for any update errors
    const updateErrors = results.filter(result => result.error);
    if (updateErrors.length > 0) {
      console.error('Error updating template order:', updateErrors);
      return { success: false, error: 'Failed to update some template orders' };
    }
    
    // Update inventory version for optimistic locking
    const { error: versionError } = await supabase
      .from('inventories')
      .update({ 
        version: (inventory.version || 0) + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', inventoryId)
      .eq('version', currentVersion); // Ensure version hasn't changed
    
    if (versionError) {
      if (versionError.code === 'PGRST116') {
        return { success: false, error: 'Inventory has been modified by another user. Please refresh and try again.' };
      }
      console.error('Error updating inventory version:', versionError);
      return { success: false, error: 'Failed to update inventory version' };
    }
    
    revalidatePath(`/inventory/${inventoryId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error reordering field templates:', error);
    return { success: false, error: `Failed to reorder field templates: ${error.message}` };
  }
}