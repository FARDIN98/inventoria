'use server'

import { 
  parseIdFormat, 
  generateCustomId, 
  validateCustomId, 
  formatElementValue, 
  getNextSequenceNumber, 
  customIdExists, 
  generateUniqueCustomId 
} from './custom-id-generator.js'

/**
 * Server action wrapper for parseIdFormat
 */
export async function parseIdFormatAction(customIdFormat) {
  return await parseIdFormat(customIdFormat)
}

/**
 * Server action wrapper for generateCustomId
 */
export async function generateCustomIdAction(format, inventoryId, existingItemCount = null) {
  return await generateCustomId(format, inventoryId, existingItemCount)
}

/**
 * Server action wrapper for validateCustomId
 */
export async function validateCustomIdAction(customId, format) {
  return await validateCustomId(customId, format)
}

/**
 * Server action wrapper for formatElementValue
 */
export async function formatElementValueAction(value, options = {}) {
  return await formatElementValue(value, options)
}

/**
 * Server action wrapper for getNextSequenceNumber
 */
export async function getNextSequenceNumberAction(inventoryId) {
  return await getNextSequenceNumber(inventoryId)
}

/**
 * Server action wrapper for customIdExists
 */
export async function customIdExistsAction(customId, inventoryId, excludeItemId = null) {
  return await customIdExists(customId, inventoryId, excludeItemId)
}

/**
 * Server action wrapper for generateUniqueCustomId
 */
export async function generateUniqueCustomIdAction(format, inventoryId, maxAttempts = 10) {
  return await generateUniqueCustomId(format, inventoryId, maxAttempts)
}