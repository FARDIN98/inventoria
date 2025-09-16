'use server'

import { getAuthenticatedUser, createServiceRoleClient } from '@/lib/utils/auth-utils'
import { dropboxService } from '@/lib/services/dropbox-service'
import { getInventoryByIdAction } from '@/lib/inventory-actions'

/**
 * Create a support ticket and upload it to Dropbox for Power Automate processing
 * @param {Object} ticketData - Ticket information
 * @param {string} ticketData.summary - Issue summary
 * @param {string} ticketData.priority - Priority level (High, Average, Low)
 * @param {string} ticketData.inventoryTitle - Title of related inventory (optional)
 * @param {string} ticketData.currentUrl - URL where ticket was created
 * @returns {Promise<Object>} Result of ticket creation
 */
export async function createSupportTicket(ticketData) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser()
    
    // Get admin emails
    const adminEmails = await getAdminEmails()
    
    if (!adminEmails.length) {
      return {
        success: false,
        error: 'No admin users found to notify'
      }
    }
    
    // Extract inventory title from URL if on inventory page
    let inventoryTitle = ticketData.inventoryTitle || 'N/A'
    
    if (ticketData.currentUrl) {
      const inventoryMatch = ticketData.currentUrl.match(/\/inventory\/([a-f0-9-]{36})/i)
      if (inventoryMatch) {
        const inventoryId = inventoryMatch[1]
        try {
          const inventoryResult = await getInventoryByIdAction(inventoryId)
          if (inventoryResult.success && inventoryResult.inventory) {
            inventoryTitle = inventoryResult.inventory.title
          }
        } catch (error) {
          console.warn('Failed to fetch inventory title:', error)
          // Keep default 'N/A' if fetch fails
        }
      }
    }
    
    // Generate ticket JSON
    const ticketJson = {
      "Reported by": user.email || user.user_metadata?.email || 'Unknown User',
      "Inventory": inventoryTitle,
      "Link": ticketData.currentUrl,
      "Priority": ticketData.priority,
      "Summary": ticketData.summary,
      "Admins e-mail addresses": adminEmails,
      "Created at": new Date().toISOString(),
      "User ID": user.id,
      "User Name": user.user_metadata?.name || user.name || user.email?.split('@')[0] || 'Unknown'
    }
    
    // Generate filename
    const filename = dropboxService.generateTicketFilename(user.id, ticketData.priority)
    
    // Upload to Dropbox
    const uploadResult = await dropboxService.uploadJsonFile(filename, ticketJson)
    
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload ticket to Dropbox'
      }
    }
    
    console.log('Support ticket created and uploaded:', {
      filename,
      path: uploadResult.path,
      priority: ticketData.priority,
      user: user.email
    })
    
    return {
      success: true,
      filename,
      path: uploadResult.path,
      message: 'Support ticket created successfully'
    }
    
  } catch (error) {
    console.error('Error creating support ticket:', error)
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
 * Test Dropbox connection (for debugging)
 * @returns {Promise<Object>} Connection test result
 */
export async function testDropboxConnection() {
  try {
    await getAuthenticatedUser() // Ensure user is authenticated
    return await dropboxService.testConnection()
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Authentication required'
    }
  }
}