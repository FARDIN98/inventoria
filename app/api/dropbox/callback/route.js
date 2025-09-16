import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const baseUrl = new URL(request.url).origin
  
  if (error) {
    return NextResponse.redirect(`${baseUrl}/dropbox-callback-result?error=dropbox_auth_failed`)
  }
  
  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dropbox-callback-result?error=no_auth_code`)
  }
  
  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.DROPBOX_APP_KEY,
        client_secret: process.env.DROPBOX_APP_SECRET,
        redirect_uri: process.env.DROPBOX_REDIRECT_URI,
      }),
    })
    
    const tokens = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || 'Token exchange failed')
    }
    
    // Store tokens in database
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/dropbox-callback-result?error=not_authenticated`)
    }
    
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    
    const { error: dbError } = await supabase
      .from('dropbox_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (dbError) {
      throw new Error('Failed to store tokens')
    }
    
    return NextResponse.redirect(`${baseUrl}/dropbox-callback-result?success=dropbox_connected`)
    
  } catch (error) {
    console.error('Dropbox OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/dropbox-callback-result?error=dropbox_connection_failed`)
  }
}