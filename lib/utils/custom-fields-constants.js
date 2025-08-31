/**
 * Supported field types for custom fields
 * These correspond to the FieldType enum in Prisma schema
 */
export const FIELD_TYPES = {
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  NUMBER: 'NUMBER',
  DOCUMENT: 'DOCUMENT',
  BOOLEAN: 'BOOLEAN'
}

/**
 * Maximum number of fields allowed per type
 */
export const MAX_FIELDS_PER_TYPE = 3

/**
 * Fixed fields that are always present in items
 * These are not customizable but always displayed
 */
export const FIXED_FIELDS = {
  CUSTOM_ID: {
    key: 'customId',
    title: 'Custom ID',
    type: 'text',
    editable: true,
    alwaysVisible: true
  },
  CREATED_BY: {
    key: 'createdBy',
    title: 'Created By',
    type: 'text',
    editable: false,
    alwaysVisible: true
  },
  CREATED_AT: {
    key: 'createdAt',
    title: 'Created At',
    type: 'datetime',
    editable: false,
    alwaysVisible: true
  },
  UPDATED_AT: {
    key: 'updatedAt',
    title: 'Updated At',
    type: 'datetime',
    editable: false,
    alwaysVisible: false
  }
}

/**
 * HTML input types mapping for field types
 */
export const INPUT_TYPE_MAPPING = {
  [FIELD_TYPES.TEXT]: 'text',
  [FIELD_TYPES.TEXTAREA]: 'textarea',
  [FIELD_TYPES.NUMBER]: 'number',
  [FIELD_TYPES.DOCUMENT]: 'url',
  [FIELD_TYPES.BOOLEAN]: 'checkbox'
}

/**
 * Field column mapping for Item model
 * Maps field type and index to actual database column
 */
export const FIELD_COLUMN_MAPPING = {
  [FIELD_TYPES.TEXT]: ['text1', 'text2', 'text3'],
  [FIELD_TYPES.TEXTAREA]: ['textArea1', 'textArea2', 'textArea3'],
  [FIELD_TYPES.NUMBER]: ['num1', 'num2', 'num3'],
  [FIELD_TYPES.DOCUMENT]: ['doc1', 'doc2', 'doc3'],
  [FIELD_TYPES.BOOLEAN]: ['bool1', 'bool2', 'bool3']
}

/**
 * Validation patterns for different field types
 */
export const VALIDATION_PATTERNS = {
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
}