import { Dropbox } from 'dropbox'
import { createServiceRoleClient } from '@/lib/utils/auth-utils'

class DropboxOAuthService {
  /**
   * Get Supabase client with service role
   * @returns {Promise<Object>} Supabase client
   */
  async _getSupabaseClient() {
    return await createServiceRoleClient()
  }
  
  /**
   * Get valid access token for user (refresh if needed)
   * @param {string} userId - User ID
   * @returns {Promise<string>} Valid access token
   */
  async getValidAccessToken(userId) {
    // Get stored tokens
    const supabase = await this._getSupabaseClient()
    const { data: tokenData, error } = await supabase
      .from('dropbox_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error || !tokenData) {
      throw new Error('No Dropbox tokens found. Please reconnect your Dropbox account.')
    }
    
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    // If token is still valid, return it
    if (now < expiresAt) {
      return tokenData.access_token
    }
    
    // Token expired, refresh it
    return await this.refreshAccessToken(userId, tokenData.refresh_token)
  }
  
  /**
   * Refresh access token using refresh token
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<string>} New access token
   */
  async refreshAccessToken(userId, refreshToken) {
    try {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.DROPBOX_APP_KEY,
          client_secret: process.env.DROPBOX_APP_SECRET,
        }),
      })
      
      const tokens = await response.json()
      
      if (!response.ok) {
        throw new Error(tokens.error_description || 'Token refresh failed')
      }
      
      // Update stored tokens
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
      
      const supabase = await this._getSupabaseClient()
      const { error } = await supabase
        .from('dropbox_tokens')
        .update({
          access_token: tokens.access_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (error) {
        throw new Error('Failed to update tokens')
      }
      
      return tokens.access_token
      
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw new Error('Failed to refresh Dropbox token. Please reconnect your account.')
    }
  }
  
  /**
   * Upload file to Dropbox with automatic token refresh
   * @param {string} userId - User ID
   * @param {string} filename - File name
   * @param {Object} jsonData - JSON data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadJsonFile(userId, filename, jsonData) {
    try {
      const accessToken = await this.getValidAccessToken(userId)
      
      const dbx = new Dropbox({ 
        accessToken,
        fetch: fetch
      })
      
      const response = await dbx.filesUpload({
        path: `/support-tickets/${filename}`,
        contents: JSON.stringify(jsonData, null, 2),
        mode: 'overwrite',
        autorename: true
      })
      
      return {
        success: true,
        file: response.result
      }
      
    } catch (error) {
      console.error('Dropbox upload error:', error)
      
      if (error.status === 401) {
        // Try to refresh token and retry once
        try {
          const supabase = await this._getSupabaseClient()
          const { data: tokenData } = await supabase
            .from('dropbox_tokens')
            .select('refresh_token')
            .eq('user_id', userId)
            .single()
          
          if (tokenData) {
            const newAccessToken = await this.refreshAccessToken(userId, tokenData.refresh_token)
            
            const dbx = new Dropbox({ 
              accessToken: newAccessToken,
              fetch: fetch
            })
            
            const response = await dbx.filesUpload({
              path: `/support-tickets/${filename}`,
              contents: JSON.stringify(jsonData, null, 2),
              mode: 'overwrite',
              autorename: true
            })
            
            return {
              success: true,
              file: response.result
            }
          }
        } catch (retryError) {
          console.error('Retry after token refresh failed:', retryError)
        }
      }
      
      return {
        success: false,
        error: error.message || 'Upload failed'
      }
    }
  }
  
  /**
   * Check if user has connected Dropbox
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if connected
   */
  async isConnected(userId) {
    const supabase = await this._getSupabaseClient()
    const { data, error } = await supabase
      .from('dropbox_tokens')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    return !error && !!data
  }
  
  /**
   * Disconnect Dropbox (remove tokens)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async disconnect(userId) {
    const supabase = await this._getSupabaseClient()
    const { error } = await supabase
      .from('dropbox_tokens')
      .delete()
      .eq('user_id', userId)
    
    return !error
  }
}

export const dropboxOAuthService = new DropboxOAuthService()