import { Dropbox } from 'dropbox'

/**
 * Dropbox Service for uploading support ticket JSON files
 * Uses the configured Dropbox access token to upload files for Power Automate integration
 */
class DropboxService {
  constructor() {
    this.dbx = new Dropbox({ 
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
      fetch: fetch
    })
  }

  /**
   * Validate if the access token is working
   * @returns {Promise<boolean>} True if token is valid
   */
  async validateToken() {
    try {
      await this.dbx.usersGetCurrentAccount()
      return true
    } catch (error) {
      console.error('Dropbox token validation failed:', error)
      return false
    }
  }

  /**
   * Upload a JSON file to Dropbox
   * @param {string} filename - Name of the file to upload
   * @param {Object} jsonData - JSON data to upload
   * @returns {Promise<Object>} Upload result
   */
  async uploadJsonFile(filename, jsonData) {
    try {
      // Check if access token is configured
      if (!process.env.DROPBOX_ACCESS_TOKEN) {
        console.error('DROPBOX_ACCESS_TOKEN is not configured in environment variables')
        return {
          success: false,
          error: 'Dropbox access token is not configured. Please check your environment variables.'
        }
      }

      // Validate token before attempting upload
      const isTokenValid = await this.validateToken()
      if (!isTokenValid) {
        console.error('Dropbox access token is invalid or expired')
        return {
          success: false,
          error: 'Dropbox access token is invalid or expired. Please regenerate your access token.'
        }
      }

      const jsonString = JSON.stringify(jsonData, null, 2)
      const buffer = Buffer.from(jsonString, 'utf8')
      
      const response = await this.dbx.filesUpload({
        path: `/support-tickets/${filename}`,
        contents: buffer,
        mode: 'add',
        autorename: true
      })
      
      console.log('File uploaded to Dropbox:', response.result.path_display)
      
      return {
        success: true,
        path: response.result.path_display,
        id: response.result.id,
        size: response.result.size
      }
    } catch (error) {
      console.error('Dropbox upload error:', error)
      
      // Handle specific error types
      if (error.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Your Dropbox access token is invalid or expired. Please regenerate your access token.'
        }
      } else if (error.status === 403) {
        return {
          success: false,
          error: 'Access denied. Please check your Dropbox app permissions.'
        }
      } else if (error.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        }
      }
      
      return {
        success: false,
        error: error.message || 'Failed to upload file to Dropbox'
      }
    }
  }

  /**
   * Generate a unique filename for the support ticket
   * @param {string} userId - User ID
   * @param {string} priority - Ticket priority
   * @returns {string} Generated filename
   */
  generateTicketFilename(userId, priority) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const shortUserId = userId.substring(0, 8)
    return `ticket-${priority.toLowerCase()}-${shortUserId}-${timestamp}.json`
  }

  /**
   * Test Dropbox connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const response = await this.dbx.usersGetCurrentAccount()
      return {
        success: true,
        account: response.result.name.display_name,
        email: response.result.email
      }
    } catch (error) {
      console.error('Dropbox connection test failed:', error)
      return {
        success: false,
        error: error.message || 'Failed to connect to Dropbox'
      }
    }
  }
}

// Export singleton instance
export const dropboxService = new DropboxService()
export default dropboxService