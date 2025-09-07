import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { ELEMENT_TYPES, DATETIME_FORMATS } from './custom-id-constants.js'

// Re-export constants for backward compatibility
export { ELEMENT_TYPES, DATETIME_FORMATS }

/**
 * Parse custom ID format from JSON string into elements array
 * @param {string} customIdFormat - JSON string containing format configuration
 * @returns {Promise<Array>} Array of element objects
 * @throws {Error} If format is invalid or malformed
 */
export async function parseIdFormat(customIdFormat) {
  if (!customIdFormat) {
    throw new Error('Custom ID format is required')
  }

  try {
    const parsed = JSON.parse(customIdFormat)
    
    if (!parsed.elements || !Array.isArray(parsed.elements)) {
      throw new Error('Format must contain an elements array')
    }

    if (parsed.elements.length === 0) {
      throw new Error('Format must contain at least one element')
    }

    if (parsed.elements.length > 10) {
      throw new Error('Format cannot contain more than 10 elements')
    }

    // Validate each element
    parsed.elements.forEach((element, index) => {
      validateElement(element, index)
    })

    return parsed.elements
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format')
    }
    throw error
  }
}

/**
 * Validate a single element in the format
 * @param {Object} element - Element to validate
 * @param {number} index - Element index for error reporting
 * @throws {Error} If element is invalid
 */
function validateElement(element, index) {
  if (!element.type) {
    throw new Error(`Element at index ${index} must have a type`)
  }

  if (!Object.values(ELEMENT_TYPES).includes(element.type)) {
    throw new Error(`Invalid element type '${element.type}' at index ${index}`)
  }

  // Validate FIXED_TEXT elements must have value
  if (element.type === ELEMENT_TYPES.FIXED_TEXT && !element.value) {
    throw new Error(`FIXED_TEXT element at index ${index} must have a value`)
  }

  // Validate options object exists
  if (!element.options) {
    element.options = {}
  }
}

/**
 * Generate a custom ID based on the provided format
 * @param {string|Array} format - Format string (JSON) or parsed elements array
 * @param {string} inventoryId - ID of the inventory
 * @param {number} existingItemCount - Current count of items in inventory
 * @returns {Promise<string>} Generated custom ID
 */
export async function generateCustomId(format, inventoryId, existingItemCount = null) {
  let elements
  
  if (typeof format === 'string') {
    elements = await parseIdFormat(format)
  } else if (Array.isArray(format)) {
    elements = format
  } else {
    throw new Error('Format must be a JSON string or elements array')
  }

  if (!inventoryId) {
    throw new Error('Inventory ID is required')
  }

  const idParts = []
  const now = new Date()

  for (const element of elements) {
    let value

    switch (element.type) {
      case ELEMENT_TYPES.FIXED_TEXT:
        value = element.value
        break

      case ELEMENT_TYPES.RANDOM_20BIT:
        value = generateRandomNumber(20)
        break

      case ELEMENT_TYPES.RANDOM_32BIT:
        value = generateRandomNumber(32)
        break

      case ELEMENT_TYPES.RANDOM_6DIGIT:
        value = generateRandomDigits(6)
        break

      case ELEMENT_TYPES.RANDOM_9DIGIT:
        value = generateRandomDigits(9)
        break

      case ELEMENT_TYPES.GUID:
        value = uuidv4()
        break

      case ELEMENT_TYPES.DATETIME:
        value = formatDateTime(now, element.options.format || 'YYYYMMDD')
        break

      case ELEMENT_TYPES.SEQUENCE:
        const sequenceNumber = existingItemCount !== null 
          ? existingItemCount + 1 
          : await getNextSequenceNumber(inventoryId)
        value = sequenceNumber.toString()
        break

      default:
        throw new Error(`Unsupported element type: ${element.type}`)
    }

    // Apply formatting options
    const formattedValue = await formatElementValue(value, element.options)
    idParts.push(formattedValue)
  }

  return idParts.join('')
}

/**
 * Validate if a custom ID matches the specified format
 * @param {string} customId - The custom ID to validate
 * @param {string|Array} format - Format string (JSON) or parsed elements array
 * @returns {Promise<boolean>} True if ID matches format, false otherwise
 */
export async function validateCustomId(customId, format) {
  if (!customId) {
    return false
  }

  try {
    let elements
    
    if (typeof format === 'string') {
      elements = await parseIdFormat(format)
    } else if (Array.isArray(format)) {
      elements = format
    } else {
      return false
    }

    // Build regex pattern from format elements
    let regexPattern = '^'
    
    for (const element of elements) {
      switch (element.type) {
        case ELEMENT_TYPES.FIXED_TEXT:
          // Escape special regex characters
          regexPattern += escapeRegex(element.value)
          break

        case ELEMENT_TYPES.RANDOM_20BIT:
          // 20-bit number: 0 to 1048575 (up to 7 digits)
          regexPattern += '\\d{1,7}'
          break

        case ELEMENT_TYPES.RANDOM_32BIT:
          // 32-bit number: 0 to 4294967295 (up to 10 digits)
          regexPattern += '\\d{1,10}'
          break

        case ELEMENT_TYPES.RANDOM_6DIGIT:
          const minDigits6 = element.options.minDigits || 6
          regexPattern += `\\d{${minDigits6},6}`
          break

        case ELEMENT_TYPES.RANDOM_9DIGIT:
          const minDigits9 = element.options.minDigits || 9
          regexPattern += `\\d{${minDigits9},9}`
          break

        case ELEMENT_TYPES.GUID:
          // UUID v4 pattern
          regexPattern += '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
          break

        case ELEMENT_TYPES.DATETIME:
          const dateFormat = element.options.format || 'YYYYMMDD'
          regexPattern += getDateTimeRegexPattern(dateFormat)
          break

        case ELEMENT_TYPES.SEQUENCE:
          const minDigitsSeq = element.options.minDigits || 1
          regexPattern += `\\d{${minDigitsSeq},}`
          break

        default:
          return false
      }
    }
    
    regexPattern += '$'
    const regex = new RegExp(regexPattern)
    return regex.test(customId)
  } catch (error) {
    return false
  }
}

/**
 * Format element value with options
 * @param {*} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {Promise<string>} Formatted value
 */
export async function formatElementValue(value, options = {}) {
  let formattedValue = value.toString()

  // Apply leading zeros for numeric values
  if (options.leadingZeros && options.minDigits) {
    const minDigits = parseInt(options.minDigits)
    if (minDigits > 0 && /^\d+$/.test(formattedValue)) {
      formattedValue = formattedValue.padStart(minDigits, '0')
    }
  }

  // Apply uppercase/lowercase transformations
  if (options.case === 'upper') {
    formattedValue = formattedValue.toUpperCase()
  } else if (options.case === 'lower') {
    formattedValue = formattedValue.toLowerCase()
  }

  return formattedValue
}

/**
 * Get the next sequence number for an inventory
 * @param {string} inventoryId - ID of the inventory
 * @returns {Promise<number>} Next sequence number (item count + 1)
 */
export async function getNextSequenceNumber(inventoryId) {
  if (!inventoryId) {
    throw new Error('Inventory ID is required')
  }

  try {
    console.log('🔢 Getting sequence number for inventory:', inventoryId)
    const supabase = await createClient()
    
    const { count, error } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('inventoryId', inventoryId)
    
    if (error) {
      console.error('❌ Error counting items:', error)
      throw new Error(`Failed to count items: ${error.message}`)
    }
    
    const sequenceNumber = (count || 0) + 1
    console.log('✅ Sequence number calculated:', { count, sequenceNumber })
    
    return sequenceNumber
  } catch (error) {
    console.error('❌ Error in getNextSequenceNumber:', error)
    throw new Error(`Failed to get sequence number: ${error.message}`)
  }
}

/**
 * Generate a random number within bit range
 * @param {number} bits - Number of bits (20 or 32)
 * @returns {number} Random number
 */
function generateRandomNumber(bits) {
  const max = Math.pow(2, bits) - 1
  return Math.floor(Math.random() * (max + 1))
}

/**
 * Generate random digits string
 * @param {number} digits - Number of digits
 * @returns {string} Random digits string
 */
function generateRandomDigits(digits) {
  let result = ''
  for (let i = 0; i < digits; i++) {
    result += Math.floor(Math.random() * 10).toString()
  }
  return result
}

/**
 * Format datetime according to pattern
 * @param {Date} date - Date to format
 * @param {string} pattern - Format pattern
 * @returns {string} Formatted datetime string
 */
function formatDateTime(date, pattern) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  switch (pattern) {
    case 'YYYY':
      return year.toString()
    case 'MM':
      return month
    case 'DD':
      return day
    case 'HH':
      return hours
    case 'mm':
      return minutes
    case 'ss':
      return seconds
    case 'YYYYMMDD':
      return `${year}${month}${day}`
    case 'HHMMSS':
      return `${hours}${minutes}${seconds}`
    case 'YYYYMMDDHHMMSS':
      return `${year}${month}${day}${hours}${minutes}${seconds}`
    default:
      return `${year}${month}${day}` // Default to YYYYMMDD
  }
}

/**
 * Get regex pattern for datetime format
 * @param {string} format - Datetime format
 * @returns {string} Regex pattern
 */
function getDateTimeRegexPattern(format) {
  switch (format) {
    case 'YYYY':
      return '\\d{4}'
    case 'MM':
      return '\\d{2}'
    case 'DD':
      return '\\d{2}'
    case 'HH':
      return '\\d{2}'
    case 'mm':
      return '\\d{2}'
    case 'ss':
      return '\\d{2}'
    case 'YYYYMMDD':
      return '\\d{8}'
    case 'HHMMSS':
      return '\\d{6}'
    case 'YYYYMMDDHHMMSS':
      return '\\d{14}'
    default:
      return '\\d{8}' // Default to YYYYMMDD
  }
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Check if custom ID already exists in inventory
 * @param {string} customId - Custom ID to check
 * @param {string} inventoryId - Inventory ID
 * @param {string} excludeItemId - Item ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if ID exists, false otherwise
 */
export async function customIdExists(customId, inventoryId, excludeItemId = null) {
  if (!customId || !inventoryId) {
    return false
  }

  try {
    console.log('🔍 Checking custom ID existence:', { customId, inventoryId, excludeItemId })
    const supabase = await createClient()
    
    let query = supabase
      .from('items')
      .select('id')
      .eq('inventoryId', inventoryId)
      .eq('customId', customId)
    
    if (excludeItemId) {
      query = query.neq('id', excludeItemId)
    }
    
    const { data, error } = await query.single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('❌ Error checking custom ID existence:', error)
      throw new Error(`Failed to check custom ID existence: ${error.message}`)
    }
    
    const exists = !!data
    console.log('✅ Custom ID existence check result:', { customId, exists })
    
    return exists
  } catch (error) {
    console.error('❌ Error in customIdExists:', error)
    throw new Error(`Failed to check custom ID existence: ${error.message}`)
  }
}

/**
 * Generate a unique custom ID for an inventory
 * @param {string|Array} format - Format string (JSON) or parsed elements array
 * @param {string} inventoryId - ID of the inventory
 * @param {number} maxAttempts - Maximum generation attempts
 * @returns {Promise<string>} Unique custom ID
 */
export async function generateUniqueCustomId(format, inventoryId, maxAttempts = 10) {
  console.log('🎯 Starting generateUniqueCustomId:', { inventoryId, maxAttempts })
  
  // First, try to generate a basic ID
  let baseCustomId = await generateCustomId(format, inventoryId)
  console.log('🆔 Base custom ID generated:', baseCustomId)
  
  // Check if the base ID is unique
  let exists = await customIdExists(baseCustomId, inventoryId)
  if (!exists) {
    console.log('✅ Base custom ID is unique:', baseCustomId)
    return baseCustomId
  }
  
  console.log('⚠️ Base custom ID exists, trying with sequence numbers:', baseCustomId)
  
  // If base ID exists, try adding sequence numbers
  for (let sequence = 1; sequence <= maxAttempts; sequence++) {
    const sequencedId = `${baseCustomId}-${sequence.toString().padStart(2, '0')}`
    console.log(`🔢 Trying sequenced ID (attempt ${sequence}):`, sequencedId)
    
    const sequenceExists = await customIdExists(sequencedId, inventoryId)
    if (!sequenceExists) {
      console.log('✅ Unique sequenced ID found:', sequencedId)
      return sequencedId
    }
  }

  console.error('❌ Failed to generate unique custom ID after all attempts')
  throw new Error(`Failed to generate unique custom ID after ${maxAttempts} attempts`)
}