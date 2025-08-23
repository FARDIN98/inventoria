'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server action for email/password sign in
 */
export async function signInAction(formData) {
  const email = formData.get('email')
  const password = formData.get('password')

  if (!email || !password) {
    return {
      success: false,
      error: 'Email and password are required'
    }
  }

  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString()
    })

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    if (data.user) {
      redirect('/dashboard')
    }

    return {
      success: true,
      user: data.user
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    }
  }
}

/**
 * Server action for email/password sign up
 */
export async function signUpAction(formData) {
  const email = formData.get('email')
  const password = formData.get('password')

  if (!email || !password) {
    return {
      success: false,
      error: 'Email and password are required'
    }
  }

  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString()
    })

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    // If user was created successfully, also create a record in the users table
    if (data.user) {
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.email.split('@')[0], // Use email prefix as default name
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      
      if (userInsertError) {
        console.error('Error creating user record:', userInsertError)
        // Don't fail the signup if user record creation fails
        // The auth user is already created
      }
      
      redirect('/dashboard')
    }

    return {
      success: true,
      user: data.user
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    }
  }
}

/**
 * Server action for sign out
 */
export async function signOutAction() {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    redirect('/login')
  } catch (error) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    }
  }
}

/**
 * Get current user session server-side
 */
export async function getCurrentUserServer() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return { user: null, error: error.message }
    }
    
    return { user, error: null }
  } catch (error) {
    return { user: null, error: error.message }
  }
}

/**
 * Check if user is authenticated server-side
 */
export async function checkAuthServer() {
  try {
    const supabase = await createClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return { isAuthenticated: false, user: null }
    }
    
    return {
      isAuthenticated: !!session?.user,
      user: session?.user || null
    }
  } catch (error) {
    return { isAuthenticated: false, user: null }
  }
}