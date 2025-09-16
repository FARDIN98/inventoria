'use server'

import { getAuthenticatedUser, createServiceRoleClient } from '@/lib/utils/auth-utils'
import { dropboxOAuthService } from '@/lib/services/dropbox-oauth-service'
import { getInventoryByIdAction } from '@/lib/inventory-actions'

/**
 * Create a support ticket and upload it to Dropbox
 * @param {Object} ticketData - Ticket information
 * @returns {Promise<Object>} Upload result
 */
export async function createSupportTicket(ticketData) {
  try {
    const user = await getAuthenticatedUser()
    
    // Check if user has connected Dropbox
    const isConnected = await dropboxOAuthService.isConnected(user.id)
    if (!isConnected) {
      return {
        success: false,
        error: 'Please connect your Dropbox account first.',
        requiresAuth: true
      }
    }
    
    // Extract inventory information from URL if available
    let inventoryTitle = ticketData.inventoryTitle || 'N/A'
    let inventoryLink = ticketData.currentUrl || 'N/A'
    
    // Check if user is on an inventory page
    if (ticketData.currentUrl && ticketData.currentUrl.includes('/inventory/')) {
      try {
        // Extract inventory ID from URL
        const urlParts = ticketData.currentUrl.split('/inventory/')
        if (urlParts.length > 1) {
          const inventoryId = urlParts[1].split('?')[0].split('#')[0] // Remove query params and hash
          
          // Fetch inventory details
          const inventoryResult = await getInventoryByIdAction(inventoryId)
          if (inventoryResult.success && inventoryResult.inventory) {
            inventoryTitle = inventoryResult.inventory.title
            inventoryLink = ticketData.currentUrl
          }
        }
      } catch (error) {
        console.error('Failed to fetch inventory details:', error)
        // Continue with default values if fetch fails
      }
    }
    
    // Generate ticket data
    const ticketJson = {
      "Reported by": user.email || user.user_metadata?.email || 'Unknown User',
      "Inventory": inventoryTitle,
      "Link": inventoryLink,
      "Priority": ticketData.priority,
      "Summary": ticketData.summary,
      "Admins' e-mail addresses": await getAdminEmails(),
      "Created at": new Date().toISOString(),
      "User ID": user.id,
      "User Name": user.user_metadata?.full_name || user.email || 'Unknown'
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `support-ticket-${timestamp}.json`
    
    // Upload to Dropbox using OAuth service
    const result = await dropboxOAuthService.uploadJsonFile(user.id, filename, ticketJson)
    
    return result
    
  } catch (error) {
    console.error('Support ticket creation failed:', error)
    return {
      success: false,
      error: error.message || 'Failed to create support ticket'
    }
  }
}

/**
 * Get all admin email addresses for notifications
 * @returns {Promise<string[]>} Array of admin email addresses
 */
async function getAdminEmails() {
  try {
    const supabase = await createServiceRoleClient()
    
    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'ADMIN')
      .eq('isBlocked', false)
    
    if (error) {
      console.error('Error fetching admin emails:', error)
      return []
    }
    
    return adminUsers.map(admin => admin.email).filter(Boolean)
  } catch (error) {
    console.error('Error in getAdminEmails:', error)
    return []
  }
}

/**
 * Check Dropbox connection status
 * @returns {Promise<Object>} Connection status
 */
export async function checkDropboxConnection() {
  try {
    const user = await getAuthenticatedUser()
    const isConnected = await dropboxOAuthService.isConnected(user.id)
    
    return {
      success: true,
      connected: isConnected
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Disconnect Dropbox
 * @returns {Promise<Object>} Disconnect result
 */
export async function disconnectDropbox() {
  try {
    const user = await getAuthenticatedUser()
    const success = await dropboxOAuthService.disconnect(user.id)
    
    return {
      success,
      message: success ? 'Dropbox disconnected successfully' : 'Failed to disconnect'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}