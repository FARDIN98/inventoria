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

// Check if user has admin permissions
export async function checkAdminPermission() {
  try {
    const user = await getAuthenticatedUser()
    
    if (!user) {
      return { success: false, error: 'Authentication required', isAdmin: false }
    }

    // Use service role key to bypass RLS for admin permission check
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Ensure user exists in users table (for existing users who signed up before the fix)
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, role, isBlocked')
      .eq('id', user.id)
      .single()
    
    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist in users table, create it
      console.log('Creating missing user record for admin check...')
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
        return { success: false, error: 'Failed to create user record', isAdmin: false }
      }
      
      // Return with default USER role (not admin)
      return { success: true, isAdmin: false, userRecord: { role: 'USER', isBlocked: false } }
    } else if (userCheckError) {
      console.error('Error checking admin permission:', userCheckError)
      return { success: false, error: 'Failed to check permissions', isAdmin: false }
    }
    
    const isAdmin = existingUser?.role === 'ADMIN' && !existingUser?.isBlocked
    
    return { success: true, isAdmin, userRecord: existingUser }
  } catch (error) {
    console.error('Error checking admin permission:', error)
    return { success: false, error: 'Failed to check permissions', isAdmin: false }
  }
}

// Get all users for admin management
export async function getAllUsersAction() {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required', users: [] }
    }

    // Use service role key to bypass RLS for admin operations
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, isBlocked, createdAt, updatedAt')
      .order('createdAt', { ascending: false })
    
    console.log('Fetched users count:', users?.length)
    console.log('Fetched users:', users)
    
    if (error) {
      console.error('Error fetching users:', error)
      return { success: false, error: 'Failed to fetch users', users: [] }
    }

    return { success: true, users }
  } catch (error) {
    console.error('Error fetching users:', error)
    return { success: false, error: 'Failed to fetch users', users: [] }
  }
}

// Block user
export async function blockUserAction(userId) {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required' }
    }

    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    const supabase = await createClient()
    
    // Update user to blocked status
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        isBlocked: true,
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error blocking user:', error)
      return { success: false, error: `Failed to block user: ${error.message}` }
    }

    revalidatePath('/admin')
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('Error blocking user:', error)
    return { success: false, error: `Failed to block user: ${error.message}` }
  }
}

// Unblock user
export async function unblockUserAction(userId) {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required' }
    }

    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    const supabase = await createClient()
    
    // Update user to unblocked status
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        isBlocked: false,
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error unblocking user:', error)
      return { success: false, error: `Failed to unblock user: ${error.message}` }
    }

    revalidatePath('/admin')
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('Error unblocking user:', error)
    return { success: false, error: `Failed to unblock user: ${error.message}` }
  }
}

// Delete user
export async function deleteUserAction(userId) {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required' }
    }

    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    const supabase = await createClient()
    
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single()
    
    if (fetchError || !existingUser) {
      return { success: false, error: 'User not found' }
    }

    // Delete user (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return { success: false, error: `Failed to delete user: ${deleteError.message}` }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: `Failed to delete user: ${error.message}` }
  }
}

// Promote user to admin
export async function promoteToAdminAction(userId) {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required' }
    }

    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    const supabase = await createClient()
    
    // Update user role to ADMIN
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        role: 'ADMIN',
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error promoting user to admin:', error)
      return { success: false, error: `Failed to promote user: ${error.message}` }
    }

    revalidatePath('/admin')
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('Error promoting user to admin:', error)
    return { success: false, error: `Failed to promote user: ${error.message}` }
  }
}

// Demote user from admin
export async function demoteFromAdminAction(userId) {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required' }
    }

    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    // Get current user to check for self-demotion
    const currentUser = await getAuthenticatedUser()
    const isSelfDemotion = currentUser && currentUser.id === userId

    const supabase = await createClient()
    
    // Update user role to USER
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        role: 'USER',
        updatedAt: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error demoting user from admin:', error)
      return { success: false, error: `Failed to demote user: ${error.message}` }
    }

    revalidatePath('/admin')
    
    return { success: true, user: updatedUser, isSelfDemotion }
  } catch (error) {
    console.error('Error demoting user from admin:', error)
    return { success: false, error: `Failed to demote user: ${error.message}` }
  }
}

// Bulk actions for multiple users
export async function bulkBlockUsersAction(userIds) {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required' }
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, error: 'User IDs are required' }
    }

    const supabase = await createClient()
    
    // Update multiple users to blocked status
    const { data: updatedUsers, error } = await supabase
      .from('users')
      .update({ 
        isBlocked: true,
        updatedAt: new Date().toISOString()
      })
      .in('id', userIds)
      .select()
    
    if (error) {
      console.error('Error bulk blocking users:', error)
      return { success: false, error: `Failed to block users: ${error.message}` }
    }

    revalidatePath('/admin')
    return { success: true, users: updatedUsers, count: updatedUsers?.length || 0 }
  } catch (error) {
    console.error('Error bulk blocking users:', error)
    return { success: false, error: `Failed to block users: ${error.message}` }
  }
}

export async function bulkUnblockUsersAction(userIds) {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required' }
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, error: 'User IDs are required' }
    }

    const supabase = await createClient()
    
    // Update multiple users to unblocked status
    const { data: updatedUsers, error } = await supabase
      .from('users')
      .update({ 
        isBlocked: false,
        updatedAt: new Date().toISOString()
      })
      .in('id', userIds)
      .select()
    
    if (error) {
      console.error('Error bulk unblocking users:', error)
      return { success: false, error: `Failed to unblock users: ${error.message}` }
    }

    revalidatePath('/admin')
    return { success: true, users: updatedUsers, count: updatedUsers?.length || 0 }
  } catch (error) {
    console.error('Error bulk unblocking users:', error)
    return { success: false, error: `Failed to unblock users: ${error.message}` }
  }
}

export async function bulkDeleteUsersAction(userIds) {
  try {
    // Check admin permission first
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success || !adminCheck.isAdmin) {
      return { success: false, error: 'Admin access required' }
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, error: 'User IDs are required' }
    }

    const supabase = await createClient()
    
    // Delete multiple users (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .in('id', userIds)
    
    if (deleteError) {
      console.error('Error bulk deleting users:', deleteError)
      return { success: false, error: `Failed to delete users: ${deleteError.message}` }
    }

    revalidatePath('/admin')
    return { success: true, count: userIds.length }
  } catch (error) {
    console.error('Error bulk deleting users:', error)
    return { success: false, error: `Failed to delete users: ${error.message}` }
  }
}