'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get authenticated user from server-side
 * Shared utility to eliminate code duplication across server actions
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Authentication required')
  }
  
  return user
}

/**
 * Create Supabase client with service role key for admin operations
 * Shared utility to eliminate code duplication in admin functions
 */
export async function createServiceRoleClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * Ensure user exists in users table (for existing users who signed up before the fix)
 * Shared utility to eliminate code duplication across server actions
 */
export async function ensureUserExists(user, supabase) {
  const { data: existingUser, error: userCheckError } = await supabase
    .from('users')
    .select('id, role, isBlocked')
    .eq('id', user.id)
    .single()
  
  if (userCheckError && userCheckError.code === 'PGRST116') {
    // User doesn't exist in users table, create it
    console.log('Creating missing user record...')
    const { error: userInsertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.email?.split('@')[0] || 'User',
        role: 'USER', // Default role
        isBlocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    
    if (userInsertError) {
      console.error('Error creating user record:', userInsertError)
      throw new Error('Failed to create user record')
    }
    
    // Return default user record
    return { role: 'USER', isBlocked: false }
  } else if (userCheckError) {
    console.error('Error checking user existence:', userCheckError)
    throw new Error('Database error checking user')
  }
  
  return existingUser
}

/**
 * Check if user has admin role and is not blocked
 * Shared utility for admin permission validation
 */
export async function checkUserAdminStatus(userId, supabase) {
  const { data: userRecord } = await supabase
    .from('users')
    .select('role, isBlocked')
    .eq('id', userId)
    .single()
  
  return {
    isAdmin: userRecord?.role === 'ADMIN' && !userRecord?.isBlocked,
    userRecord
  }
}