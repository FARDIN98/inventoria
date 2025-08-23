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
      console.log('🔧 Creating missing user record...')
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
        console.error('❌ Error creating user record:', userInsertError)
        return { success: false, error: 'Failed to create user record' }
      }
      console.log('✅ User record created successfully')
    } else if (userCheckError) {
      console.error('❌ Error checking user existence:', userCheckError)
      return { success: false, error: 'Database error checking user' }
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
        isPublic: false,
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

// Check if user is authenticated and redirect if not
export async function requireAuth() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}