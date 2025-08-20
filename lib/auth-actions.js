'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Create server-side Supabase client
function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

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
    const supabase = createServerClient()
    
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
    const supabase = createServerClient()
    
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
 * Server action for sign out
 */
export async function signOutAction() {
  try {
    const supabase = createServerClient()
    
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
    const supabase = createServerClient()
    
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
  const { user } = await getCurrentUserServer()
  return !!user
}