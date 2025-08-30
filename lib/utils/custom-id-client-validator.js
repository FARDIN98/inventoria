import { ELEMENT_TYPES, DATETIME_FORMATS } from './custom-id-constants.js'

/**
 * Client-side custom ID validation utility
 * This file contains validation functions that can be safely used in client components
 */

/**
 * Parse custom ID format from JSON string into elements array (client-safe)
 * @param {string} customIdFormat - JSON string containing format configuration
 * @returns {Array} Array of element objects
 * @throws {Error} If format is invalid or malformed
 */
export function parseIdFormatClient(customIdFormat) {
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

    return parsed.elements
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format')
    }
    throw error
  }
}

/**
 * Validate custom ID against format (client-safe)
 * @param {string} customId - The custom ID to validate
 * @param {Array|string} format - Format elements array or JSON string
 * @returns {boolean} True if valid, false otherwise
 */
export function validateCustomIdClient(customId, format) {
  try {
    if (!customId || typeof customId !== 'string') {
      return false
    }

    let elements
    if (typeof format === 'string') {
      elements = parseIdFormatClient(format)
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
          regexPattern += escapeRegex(element.value || '')
          break
          
        case ELEMENT_TYPES.RANDOM_4BIT:
          regexPattern += '[0-9A-F]{1}'
          break
          
        case ELEMENT_TYPES.RANDOM_8BIT:
          regexPattern += '[0-9A-F]{2}'
          break
          
        case ELEMENT_TYPES.RANDOM_16BIT:
          regexPattern += '[0-9A-F]{4}'
          break
          
        case ELEMENT_TYPES.RANDOM_32BIT:
          regexPattern += '[0-9A-F]{8}'
          break
          
        case ELEMENT_TYPES.GUID:
          regexPattern += '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
          break
          
        case ELEMENT_TYPES.DATETIME:
          regexPattern += getDateTimeRegexPattern(element.format || DATETIME_FORMATS.YYYYMMDD)
          break
          
        case ELEMENT_TYPES.SEQUENCE:
          const digits = element.digits || 4
          regexPattern += `\\d{1,${digits}}`
          break
          
        default:
          // Unknown element type, skip validation
          return true
      }
    }
    
    regexPattern += '$'
    
    const regex = new RegExp(regexPattern)
    return regex.test(customId)
    
  } catch (error) {
    console.error('Custom ID validation error:', error)
    return false
  }
}

/**
 * Get regex pattern for datetime format
 * @param {string} format - DateTime format
 * @returns {string} Regex pattern
 */
function getDateTimeRegexPattern(format) {
  switch (format) {
    case DATETIME_FORMATS.YYYYMMDD:
      return '\\d{4}\\d{2}\\d{2}'
    case DATETIME_FORMATS.YYYY_MM_DD:
      return '\\d{4}-\\d{2}-\\d{2}'
    case DATETIME_FORMATS.DD_MM_YYYY:
      return '\\d{2}-\\d{2}-\\d{4}'
    case DATETIME_FORMATS.MM_DD_YYYY:
      return '\\d{2}-\\d{2}-\\d{4}'
    case DATETIME_FORMATS.YYYYMMDD_HHMMSS:
      return '\\d{4}\\d{2}\\d{2}\\d{2}\\d{2}\\d{2}'
    case DATETIME_FORMATS.YYYY_MM_DD_HH_MM_SS:
      return '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}'
    default:
      return '\\d{4}\\d{2}\\d{2}' // Default to YYYYMMDD
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