import { 
  FIELD_TYPES, 
  MAX_FIELDS_PER_TYPE, 
  FIXED_FIELDS, 
  INPUT_TYPE_MAPPING, 
  FIELD_COLUMN_MAPPING,
  VALIDATION_PATTERNS
} from './custom-fields-constants.js'

// Re-export constants for backward compatibility
export { 
  FIELD_TYPES, 
  MAX_FIELDS_PER_TYPE, 
  FIXED_FIELDS, 
  INPUT_TYPE_MAPPING, 
  FIELD_COLUMN_MAPPING 
}

/**
 * Parse and validate field templates array
 * @param {Array} fieldTemplates - Array of field template objects
 * @returns {Promise<Object>} Parsed and validated field templates grouped by type
 * @throws {Error} If validation fails
 */
export async function parseFieldTemplates(fieldTemplates) {
  if (!Array.isArray(fieldTemplates)) {
    throw new Error('Field templates must be an array')
  }

  // Group templates by field type
  const groupedTemplates = {
    [FIELD_TYPES.TEXT]: [],
    [FIELD_TYPES.TEXTAREA]: [],
    [FIELD_TYPES.NUMBER]: [],
    [FIELD_TYPES.DOCUMENT]: [],
    [FIELD_TYPES.BOOLEAN]: []
  }

  // Validate and group templates
  for (const template of fieldTemplates) {
    validateFieldTemplate(template)
    
    if (!groupedTemplates[template.fieldType]) {
      groupedTemplates[template.fieldType] = []
    }
    
    groupedTemplates[template.fieldType].push(template)
  }

  // Validate field limits per type
  for (const [fieldType, templates] of Object.entries(groupedTemplates)) {
    if (templates.length > MAX_FIELDS_PER_TYPE) {
      throw new Error(`Maximum ${MAX_FIELDS_PER_TYPE} fields allowed per type. Found ${templates.length} fields of type ${fieldType}`)
    }

    // Validate field indices are within bounds (1-3)
    for (const template of templates) {
      if (template.fieldIndex < 1 || template.fieldIndex > MAX_FIELDS_PER_TYPE) {
        throw new Error(`Field index must be between 1 and ${MAX_FIELDS_PER_TYPE}. Found ${template.fieldIndex} for field type ${fieldType}`)
      }
    }

    // Check for duplicate field indices within the same type
    const indices = templates.map(t => t.fieldIndex)
    const uniqueIndices = [...new Set(indices)]
    if (indices.length !== uniqueIndices.length) {
      throw new Error(`Duplicate field indices found for field type ${fieldType}`)
    }
  }

  // Sort templates by display order within each type
  for (const fieldType of Object.keys(groupedTemplates)) {
    groupedTemplates[fieldType].sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder
      }
      return a.fieldIndex - b.fieldIndex
    })
  }

  return groupedTemplates
}

/**
 * Validate a single field template
 * @param {Object} template - Field template object
 * @throws {Error} If template is invalid
 */
function validateFieldTemplate(template) {
  if (!template || typeof template !== 'object') {
    throw new Error('Field template must be an object')
  }

  // Required fields
  const requiredFields = ['fieldType', 'fieldIndex', 'title']
  for (const field of requiredFields) {
    if (!template[field]) {
      throw new Error(`Field template missing required field: ${field}`)
    }
  }

  // Validate field type
  if (!Object.values(FIELD_TYPES).includes(template.fieldType)) {
    throw new Error(`Invalid field type: ${template.fieldType}. Must be one of: ${Object.values(FIELD_TYPES).join(', ')}`)
  }

  // Validate field index
  if (!Number.isInteger(template.fieldIndex) || template.fieldIndex < 1 || template.fieldIndex > MAX_FIELDS_PER_TYPE) {
    throw new Error(`Field index must be an integer between 1 and ${MAX_FIELDS_PER_TYPE}`)
  }

  // Validate title
  if (typeof template.title !== 'string' || template.title.trim().length === 0) {
    throw new Error('Field title must be a non-empty string')
  }

  // Validate optional fields
  if (template.description !== undefined && typeof template.description !== 'string') {
    throw new Error('Field description must be a string')
  }

  if (template.isVisible !== undefined && typeof template.isVisible !== 'boolean') {
    throw new Error('Field isVisible must be a boolean')
  }

  if (template.displayOrder !== undefined && !Number.isInteger(template.displayOrder)) {
    throw new Error('Field displayOrder must be an integer')
  }
}

// Re-export validation function from centralized utilities
export { validateFieldData } from './field-validation-utils.js'

// Re-export input type function from centralized utilities
export { getFieldInputType } from './field-validation-utils.js'

/**
 * Get the database column name for a field
 * @param {string} fieldType - Type of the field
 * @param {number} fieldIndex - Index of the field (1-3)
 * @returns {string} Database column name
 */
export function getFieldColumnName(fieldType, fieldIndex) {
  if (!Object.values(FIELD_TYPES).includes(fieldType)) {
    throw new Error(`Invalid field type: ${fieldType}`)
  }

  if (fieldIndex < 1 || fieldIndex > MAX_FIELDS_PER_TYPE) {
    throw new Error(`Field index must be between 1 and ${MAX_FIELDS_PER_TYPE}`)
  }

  const columns = FIELD_COLUMN_MAPPING[fieldType]
  if (!columns) {
    throw new Error(`No column mapping found for field type: ${fieldType}`)
  }

  return columns[fieldIndex - 1]
}

/**
 * Generate aggregates/statistics for items based on field templates
 * @param {Array} items - Array of item objects
 * @param {Array} fieldTemplates - Array of field template objects
 * @returns {Promise<Object>} Aggregated statistics
 */
export async function generateAggregates(items, fieldTemplates) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array')
  }

  if (!Array.isArray(fieldTemplates)) {
    throw new Error('Field templates must be an array')
  }

  const aggregates = {
    totalItems: items.length,
    fieldStats: {},
    fixedFieldStats: {}
  }

  // Parse field templates
  const parsedTemplates = await parseFieldTemplates(fieldTemplates)

  // Generate statistics for each field template
  for (const template of fieldTemplates) {
    const columnName = getFieldColumnName(template.fieldType, template.fieldIndex)
    const fieldKey = `${template.fieldType}_${template.fieldIndex}`
    
    aggregates.fieldStats[fieldKey] = {
      template,
      columnName,
      stats: await generateFieldStats(items, columnName, template.fieldType)
    }
  }

  // Generate statistics for fixed fields
  aggregates.fixedFieldStats = {
    customId: {
      totalUnique: new Set(items.map(item => item.customId)).size,
      totalItems: items.length
    },
    createdBy: {
      uniqueCreators: new Set(items.map(item => item.createdById)).size,
      totalItems: items.length
    },
    createdAt: {
      earliest: items.length > 0 ? new Date(Math.min(...items.map(item => new Date(item.createdAt)))) : null,
      latest: items.length > 0 ? new Date(Math.max(...items.map(item => new Date(item.createdAt)))) : null,
      totalItems: items.length
    }
  }

  return aggregates
}

/**
 * Generate statistics for a specific field
 * @param {Array} items - Array of item objects
 * @param {string} columnName - Database column name
 * @param {string} fieldType - Type of the field
 * @returns {Promise<Object>} Field statistics
 */
async function generateFieldStats(items, columnName, fieldType) {
  const values = items.map(item => item[columnName]).filter(value => value !== null && value !== undefined && value !== '')
  
  const stats = {
    totalValues: values.length,
    nullValues: items.length - values.length,
    fillRate: items.length > 0 ? (values.length / items.length * 100).toFixed(2) : 0
  }

  switch (fieldType) {
    case FIELD_TYPES.TEXT:
    case FIELD_TYPES.TEXTAREA:
      stats.uniqueValues = new Set(values).size
      stats.averageLength = values.length > 0 ? (values.reduce((sum, val) => sum + val.length, 0) / values.length).toFixed(2) : 0
      stats.mostCommon = getMostCommonValues(values, 5)
      break

    case FIELD_TYPES.NUMBER:
      const numValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v))
      if (numValues.length > 0) {
        stats.min = Math.min(...numValues)
        stats.max = Math.max(...numValues)
        stats.average = (numValues.reduce((sum, val) => sum + val, 0) / numValues.length).toFixed(2)
        stats.median = calculateMedian(numValues)
      }
      break

    case FIELD_TYPES.DOCUMENT:
      stats.uniqueUrls = new Set(values).size
      stats.domains = getDomainStats(values)
      break

    case FIELD_TYPES.BOOLEAN:
      const boolValues = values.map(v => {
        if (typeof v === 'boolean') return v
        if (v === 'true' || v === '1') return true
        if (v === 'false' || v === '0') return false
        return null
      }).filter(v => v !== null)
      
      stats.trueCount = boolValues.filter(v => v === true).length
      stats.falseCount = boolValues.filter(v => v === false).length
      stats.truePercentage = boolValues.length > 0 ? (stats.trueCount / boolValues.length * 100).toFixed(2) : 0
      break
  }

  return stats
}

/**
 * Get most common values from an array
 * @param {Array} values - Array of values
 * @param {number} limit - Maximum number of results
 * @returns {Array} Array of {value, count} objects
 */
function getMostCommonValues(values, limit = 5) {
  const frequency = {}
  values.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1
  })

  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))
}

/**
 * Calculate median of numeric array
 * @param {Array} numbers - Array of numbers
 * @returns {number} Median value
 */
function calculateMedian(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Get domain statistics from URLs
 * @param {Array} urls - Array of URL strings
 * @returns {Array} Array of {domain, count} objects
 */
function getDomainStats(urls) {
  const domains = {}
  
  urls.forEach(url => {
    try {
      const domain = new URL(url).hostname
      domains[domain] = (domains[domain] || 0) + 1
    } catch (error) {
      // Invalid URL, skip
    }
  })

  return Object.entries(domains)
    .sort(([,a], [,b]) => b - a)
    .map(([domain, count]) => ({ domain, count }))
}

/**
 * Get all field templates with their corresponding column names
 * @param {Array} fieldTemplates - Array of field template objects
 * @returns {Promise<Array>} Array of templates with column names
 */
export async function getFieldTemplatesWithColumns(fieldTemplates) {
  const parsedTemplates = await parseFieldTemplates(fieldTemplates)
  const result = []

  for (const template of fieldTemplates) {
    const columnName = getFieldColumnName(template.fieldType, template.fieldIndex)
    result.push({
      ...template,
      columnName,
      inputType: getFieldInputType(template.fieldType)
    })
  }

  return result
}

/**
 * Convert item data to field values using field templates
 * @param {Object} item - Item object from database
 * @param {Array} fieldTemplates - Array of field template objects
 * @returns {Promise<Object>} Object with field values mapped by template ID
 */
export async function mapItemToFieldValues(item, fieldTemplates) {
  if (!item || typeof item !== 'object') {
    throw new Error('Item must be an object')
  }

  const fieldValues = {}
  
  for (const template of fieldTemplates) {
    const columnName = getFieldColumnName(template.fieldType, template.fieldIndex)
    fieldValues[template.id] = item[columnName]
  }

  // Add fixed fields
  fieldValues._fixed = {
    customId: item.customId,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }

  return fieldValues
}

/**
 * Convert field values to item data using field templates
 * @param {Object} fieldValues - Object with field values mapped by template ID
 * @param {Array} fieldTemplates - Array of field template objects
 * @returns {Promise<Object>} Object with database column names and values
 */
export async function mapFieldValuesToItem(fieldValues, fieldTemplates) {
  if (!fieldValues || typeof fieldValues !== 'object') {
    throw new Error('Field values must be an object')
  }

  const itemData = {}
  
  for (const template of fieldTemplates) {
    const columnName = getFieldColumnName(template.fieldType, template.fieldIndex)
    const value = fieldValues[template.id]
    
    // Validate the value
    const isValid = await validateFieldData(template.fieldType, value)
    if (!isValid && value !== null && value !== undefined && value !== '') {
      throw new Error(`Invalid value for field ${template.title} (${template.fieldType}): ${value}`)
    }
    
    // Convert value based on field type
    itemData[columnName] = convertValueForStorage(value, template.fieldType)
  }

  return itemData
}

/**
 * Convert value for database storage based on field type
 * @param {*} value - Value to convert
 * @param {string} fieldType - Type of the field
 * @returns {*} Converted value
 */
function convertValueForStorage(value, fieldType) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  switch (fieldType) {
    case FIELD_TYPES.TEXT:
    case FIELD_TYPES.TEXTAREA:
    case FIELD_TYPES.DOCUMENT:
      return String(value)

    case FIELD_TYPES.NUMBER:
      const numValue = parseFloat(value)
      return isNaN(numValue) ? null : numValue

    case FIELD_TYPES.BOOLEAN:
      if (typeof value === 'boolean') return value
      if (value === 'true' || value === '1') return true
      if (value === 'false' || value === '0') return false
      return null

    default:
      return value
  }
}