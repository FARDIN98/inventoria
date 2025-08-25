'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Get authenticated user from server-side
async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Authentication required')
  }
  
  return user
}

// Create new inventory
export async function createInventoryAction(formData) {
  try {
    console.log('🔍 Starting inventory creation process...')
    
    const user = await getAuthenticatedUser()
    console.log('✅ User authenticated:', { id: user.id, email: user.email })
    
    if (!user) {
      console.error('❌ Authentication failed: No user found')
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()
    
    // Ensure user exists in users table (for existing users who signed up before the fix)
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist in users table, create it
      console.log('🔧 Creating missing user record for user:', { id: user.id, email: user.email })
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.email?.split('@')[0] || 'User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      
      if (userInsertError) {
        console.error('❌ Error creating user record:', {
          error: userInsertError,
          code: userInsertError.code,
          message: userInsertError.message,
          details: userInsertError.details,
          hint: userInsertError.hint,
          userId: user.id,
          userEmail: user.email
        })
        return { 
          success: false, 
          error: `Failed to create user record: ${userInsertError.message || 'Unknown error'}. Code: ${userInsertError.code || 'N/A'}` 
        }
      }
      console.log('✅ User record created successfully for:', user.email)
    } else if (userCheckError) {
      console.error('❌ Error checking user existence:', {
        error: userCheckError,
        code: userCheckError.code,
        message: userCheckError.message,
        userId: user.id
      })
      return { success: false, error: `Database error checking user: ${userCheckError.message}` }
    }

    const title = formData.get('title')
    const description = formData.get('description')
    const categoryId = formData.get('categoryId')
    const tagsString = formData.get('tags')
    
    console.log('📝 Form data extracted:', { title, description, categoryId, tagsString })
    
    // Parse tags safely
    let tags = []
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString)
        console.log('✅ Tags parsed successfully:', tags)
      } catch (e) {
        console.error('❌ Error parsing tags:', e)
        tags = []
      }
    }

    // Validate required fields
    if (!title || !title.trim()) {
      console.error('❌ Validation failed: Title is required')
      return { success: false, error: 'Title is required' }
    }

    if (!categoryId) {
      console.error('❌ Validation failed: Category is required')
      return { success: false, error: 'Category is required' }
    }

    console.log('🔄 Creating inventory in database...')
    
    // Create inventory with generated ID
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventories')
      .insert({
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description?.trim() || null,
        categoryId,
        ownerId: user.id,
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single()
    
    if (inventoryError) {
      console.error('❌ Database error creating inventory:', inventoryError)
      throw new Error(`Database error: ${inventoryError.message}`)
    }
    
    console.log('✅ Inventory created successfully:', inventory)

    // Handle tags if provided
    if (tags.length > 0) {
      console.log('🔄 Processing tags...', tags)
      
      // Create or find existing tags
      const tagPromises = tags.map(async (tagName) => {
        const tagNameLower = tagName.toLowerCase().trim()
        
        // First try to find existing tag
        const { data: existingTag } = await supabase
          .from('tags')
          .select('*')
          .eq('name', tagNameLower)
          .single()
        
        if (existingTag) {
          return existingTag
        }
        
        // Create new tag if it doesn't exist
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert({ 
            id: crypto.randomUUID(),
            name: tagNameLower 
          })
          .select()
          .single()
        
        if (tagError) {
          console.error('❌ Error creating tag:', tagError)
          throw new Error(`Tag creation error: ${tagError.message}`)
        }
        
        return newTag
      })

      const createdTags = await Promise.all(tagPromises)
      console.log('✅ Tags processed:', createdTags)

      // Associate tags with inventory
      const inventoryTagPromises = createdTags.map(tag => 
        supabase
          .from('inventory_tags')
          .insert({
            inventoryId: inventory.id,
            tagId: tag.id
          })
      )

      const tagResults = await Promise.all(inventoryTagPromises)
      
      // Check for any tag association errors
      const tagErrors = tagResults.filter(result => result.error)
      if (tagErrors.length > 0) {
        console.error('❌ Error associating tags:', tagErrors)
        throw new Error('Failed to associate some tags with inventory')
      }
      
      console.log('✅ Tags associated with inventory')
    }

    revalidatePath('/dashboard')
    console.log('✅ Inventory creation completed successfully')
    return { success: true, inventoryId: inventory.id }

  } catch (error) {
    console.error('❌ Error creating inventory:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    })
    return { success: false, error: `Failed to create inventory: ${error.message}` }
  }
}

// Get all categories
export async function getCategoriesAction() {
  try {
    const supabase = await createClient()
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching categories:', error)
      return { success: false, error: 'Failed to fetch categories', categories: [] }
    }
    
    return { success: true, categories }
  } catch (error) {
    console.error('Error fetching categories:', error)
    return { success: false, error: 'Failed to fetch categories', categories: [] }
  }
}

// Get user's inventories
export async function getUserInventoriesAction() {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return { success: false, error: 'Authentication required', inventories: [] }
    }

    const supabase = await createClient()
    
    const { data: inventories, error } = await supabase
      .from('inventories')
      .select(`
        *,
        categories:categoryId(*),
        inventory_tags(
          tags(*)
        )
      `)
      .eq('ownerId', user.id)
      .order('createdAt', { ascending: false })
    
    if (error) {
      console.error('Error fetching user inventories:', error)
      return { success: false, error: 'Failed to fetch inventories', inventories: [] }
    }

    return { success: true, inventories }
  } catch (error) {
    console.error('Error fetching user inventories:', error)
    return { success: false, error: 'Failed to fetch inventories', inventories: [] }
  }
}

// Edit inventory with optimistic locking
export async function editInventoryAction(inventoryId, formData, currentVersion) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()
    
    // Check if inventory exists and user has permission
    const { data: inventory, error: fetchError } = await supabase
      .from('inventories')
      .select('*')
      .eq('id', inventoryId)
      .single()
    
    if (fetchError || !inventory) {
      return { success: false, error: 'Inventory not found' }
    }
    
    // Check ownership (only owner can edit)
    if (inventory.ownerId !== user.id) {
      return { success: false, error: 'Permission denied: You can only edit your own inventories' }
    }
    
    // Optimistic locking check
    if (inventory.version !== currentVersion) {
      return { success: false, error: 'Inventory has been modified by another user. Please refresh and try again.' }
    }

    const title = formData.get('title')
    const description = formData.get('description')
    const categoryId = formData.get('categoryId')
    const tagsString = formData.get('tags')
    
    // Parse tags safely
    let tags = []
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString)
      } catch (e) {
        console.error('Error parsing tags:', e)
        tags = []
      }
    }

    // Validate required fields
    if (!title || !title.trim()) {
      return { success: false, error: 'Title is required' }
    }

    if (!categoryId) {
      return { success: false, error: 'Category is required' }
    }

    // Update inventory with version increment
    const { data: updatedInventory, error: updateError } = await supabase
      .from('inventories')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        categoryId,
        updatedAt: new Date().toISOString(),
        version: (inventory.version || 0) + 1
      })
      .eq('id', inventoryId)
      .eq('version', currentVersion) // Ensure version hasn't changed
      .select()
      .single()
    
    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return { success: false, error: 'Inventory has been modified by another user. Please refresh and try again.' }
      }
      console.error('Database error updating inventory:', updateError)
      return { success: false, error: `Failed to update inventory: ${updateError.message}` }
    }

    // Handle tags update
    if (tags.length >= 0) { // Allow empty tags array to clear all tags
      // Remove existing tag associations
      await supabase
        .from('inventory_tags')
        .delete()
        .eq('inventoryId', inventoryId)
      
      if (tags.length > 0) {
        // Create or find existing tags
        const tagPromises = tags.map(async (tagName) => {
          const tagNameLower = tagName.toLowerCase().trim()
          
          // First try to find existing tag
          const { data: existingTag } = await supabase
            .from('tags')
            .select('*')
            .eq('name', tagNameLower)
            .single()
          
          if (existingTag) {
            return existingTag
          }
          
          // Create new tag if it doesn't exist
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert({ 
              id: crypto.randomUUID(),
              name: tagNameLower 
            })
            .select()
            .single()
          
          if (tagError) {
            console.error('Error creating tag:', tagError)
            throw new Error(`Tag creation error: ${tagError.message}`)
          }
          
          return newTag
        })

        const createdTags = await Promise.all(tagPromises)

        // Associate tags with inventory
        const inventoryTagPromises = createdTags.map(tag => 
          supabase
            .from('inventory_tags')
            .insert({
              inventoryId: inventoryId,
              tagId: tag.id
            })
        )

        const tagResults = await Promise.all(inventoryTagPromises)
        
        // Check for any tag association errors
        const tagErrors = tagResults.filter(result => result.error)
        if (tagErrors.length > 0) {
          console.error('Error associating tags:', tagErrors)
          return { success: false, error: 'Failed to associate some tags with inventory' }
        }
      }
    }

    revalidatePath('/dashboard')
    revalidatePath(`/inventory/${inventoryId}`)
    return { success: true, inventory: updatedInventory }

  } catch (error) {
    console.error('Error updating inventory:', error)
    return { success: false, error: `Failed to update inventory: ${error.message}` }
  }
}

// Delete inventory with permission check
export async function deleteInventoryAction(inventoryId) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()
    
    // Check if inventory exists and user has permission
    const { data: inventory, error: fetchError } = await supabase
      .from('inventories')
      .select('*')
      .eq('id', inventoryId)
      .single()
    
    if (fetchError || !inventory) {
      return { success: false, error: 'Inventory not found' }
    }
    
    // Check ownership (only owner can delete)
    if (inventory.ownerId !== user.id) {
      return { success: false, error: 'Permission denied: You can only delete your own inventories' }
    }

    // Delete inventory (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('inventories')
      .delete()
      .eq('id', inventoryId)
      .eq('ownerId', user.id) // Double-check ownership
    
    if (deleteError) {
      console.error('Database error deleting inventory:', deleteError)
      return { success: false, error: `Failed to delete inventory: ${deleteError.message}` }
    }

    revalidatePath('/dashboard')
    return { success: true }

  } catch (error) {
    console.error('Error deleting inventory:', error)
    return { success: false, error: `Failed to delete inventory: ${error.message}` }
  }
}

// Get single inventory by ID
export async function getInventoryByIdAction(inventoryId) {
  try {
    const supabase = await createClient()
    
    const { data: inventory, error } = await supabase
      .from('inventories')
      .select(`
        *,
        categories:categoryId(*),
        inventory_tags(
          tags(*)
        ),
        users:ownerId(name, email)
      `)
      .eq('id', inventoryId)
      .single()
    
    if (error) {
      console.error('Error fetching inventory:', error)
      return { success: false, error: 'Inventory not found' }
    }

    return { success: true, inventory }
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return { success: false, error: 'Failed to fetch inventory' }
  }
}

// Check if user is authenticated and redirect if not
export async function requireAuth() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

// Update all user's inventories to be public (one-time fix)
export async function makeInventoriesPublicAction() {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('inventories')
      .update({ isPublic: true })
      .eq('ownerId', user.id)
      .eq('isPublic', false)
      .select('id, title')
    
    if (error) {
      console.error('Error updating inventories to public:', error)
      return { success: false, error: 'Failed to update inventories' }
    }

    return { success: true, updatedCount: data?.length || 0, inventories: data }
  } catch (error) {
    console.error('Error making inventories public:', error)
    return { success: false, error: 'Failed to update inventories' }
  }
}