'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth-utils'

/**
 * Server action to update user's language preference
 * @param {string} language - The language code ('en' or 'es')
 * @returns {Object} - Success/error response object
 */
export async function updateUserLanguageAction(language) {
  try {
    console.log('🌐 Starting language update process...', { language })
    
    // Validate input
    if (!language || typeof language !== 'string') {
      console.error('❌ Invalid language parameter:', language)
      return { 
        success: false, 
        error: 'Language parameter is required and must be a string' 
      }
    }
    
    // Validate language code
    const validLanguages = ['en', 'es']
    if (!validLanguages.includes(language)) {
      console.error('❌ Unsupported language:', language)
      return { 
        success: false, 
        error: `Invalid language. Only ${validLanguages.join(', ')} are supported.` 
      }
    }
    
    // Get authenticated user
    let user
    try {
      user = await getAuthenticatedUser()
      console.log('✅ User authenticated:', { id: user.id, email: user.email })
    } catch (error) {
      console.log('ℹ️ User not authenticated, skipping server update')
      return { 
        success: false, 
        error: 'Unauthenticated' 
      }
    }
    
    if (!user) {
      console.log('ℹ️ No user found, skipping server update')
      return { 
        success: false, 
        error: 'Unauthenticated' 
      }
    }
    
    const supabase = await createClient()
    
    // Update user's language preference in the database
    const { data, error } = await supabase
      .from('users')
      .update({ 
        language: language,
        updatedAt: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, language')
      .single()
    
    if (error) {
      console.error('❌ Database error updating language:', error)
      return { 
        success: false, 
        error: `Failed to update language preference: ${error.message}` 
      }
    }
    
    console.log('✅ Language updated successfully:', { userId: user.id, language })
    
    return { 
      success: true, 
      data: {
        userId: user.id,
        language: language
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in updateUserLanguageAction:', error)
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred while updating language preference' 
    }
  }
}

/**
 * Server action to get user's current language preference
 * @returns {Object} - Success/error response with language data
 */
export async function getUserLanguageAction() {
  try {
    console.log('🌐 Getting user language preference...')
    
    // Get authenticated user
    let user
    try {
      user = await getAuthenticatedUser()
      console.log('✅ User authenticated:', { id: user.id, email: user.email })
    } catch (error) {
      console.log('ℹ️ User not authenticated, returning default language')
      return { 
        success: true, 
        data: { language: 'en' } // Default for unauthenticated users
      }
    }
    
    if (!user) {
      console.log('ℹ️ No user found, returning default language')
      return { 
        success: true, 
        data: { language: 'en' } // Default for unauthenticated users
      }
    }
    
    const supabase = await createClient()
    
    // Get user's language preference from the database
    const { data, error } = await supabase
      .from('users')
      .select('language')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('❌ Database error getting language:', error)
      return { 
        success: false, 
        error: `Failed to get language preference: ${error.message}` 
      }
    }
    
    const language = data?.language || 'en' // Default to English if not set
    console.log('✅ Language retrieved successfully:', { userId: user.id, language })
    
    return { 
      success: true, 
      data: { 
        userId: user.id,
        language: language 
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in getUserLanguageAction:', error)
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred while getting language preference' 
    }
  }
}