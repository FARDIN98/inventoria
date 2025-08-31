/**
 * Centralized Field Validation Utilities
 * Consolidates validation logic to maintain DRY principle
 */

import { 
  FIELD_TYPES, 
  MAX_FIELDS_PER_TYPE, 
  VALIDATION_PATTERNS,
  INPUT_TYPE_MAPPING 
} from './custom-fields-constants';

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  FIELD_TITLE_REQUIRED: 'Field title is required',
  INVALID_FIELD_TYPE: 'Valid field type is required',
  INVALID_FIELD_INDEX: (max) => `Field position must be between 1 and ${max}`,
  DUPLICATE_POSITION: (position, type) => `Position ${position} is already used for ${type} fields`,
  INVALID_URL: 'Please enter a valid URL',
  INVALID_EMAIL: 'Please enter a valid email address',
  TEXT_TOO_LONG: (max) => `Text cannot exceed ${max} characters`,
  NUMBER_INVALID: 'Please enter a valid number',
  BOOLEAN_INVALID: 'Please select a valid option'
};

/**
 * Validation rules for different field types
 */
export const FIELD_VALIDATION_RULES = {
  [FIELD_TYPES.TEXT]: {
    maxLength: 255,
    required: false
  },
  [FIELD_TYPES.TEXTAREA]: {
    maxLength: 10000,
    required: false
  },
  [FIELD_TYPES.NUMBER]: {
    min: -999999999,
    max: 999999999,
    required: false
  },
  [FIELD_TYPES.DOCUMENT]: {
    pattern: VALIDATION_PATTERNS.URL,
    required: false
  },
  [FIELD_TYPES.BOOLEAN]: {
    validValues: [true, false, 'true', 'false', '1', '0', 1, 0],
    required: false
  }
};

/**
 * Validate a field template object
 * @param {Object} template - Field template to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateFieldTemplate(template) {
  const errors = [];

  if (!template || typeof template !== 'object') {
    return { isValid: false, errors: ['Field template must be an object'] };
  }

  // Validate required title
  if (!template.title || typeof template.title !== 'string' || template.title.trim().length === 0) {
    errors.push(VALIDATION_MESSAGES.FIELD_TITLE_REQUIRED);
  }

  // Validate field type
  if (!template.fieldType || !Object.values(FIELD_TYPES).includes(template.fieldType)) {
    errors.push(VALIDATION_MESSAGES.INVALID_FIELD_TYPE);
  }

  // Validate field index
  if (!template.fieldIndex || 
      !Number.isInteger(template.fieldIndex) || 
      template.fieldIndex < 1 || 
      template.fieldIndex > MAX_FIELDS_PER_TYPE) {
    errors.push(VALIDATION_MESSAGES.INVALID_FIELD_INDEX(MAX_FIELDS_PER_TYPE));
  }

  // Validate optional description
  if (template.description !== undefined && typeof template.description !== 'string') {
    errors.push('Field description must be a string');
  }

  // Validate optional isVisible
  if (template.isVisible !== undefined && typeof template.isVisible !== 'boolean') {
    errors.push('Field isVisible must be a boolean');
  }

  // Validate optional displayOrder
  if (template.displayOrder !== undefined && !Number.isInteger(template.displayOrder)) {
    errors.push('Field displayOrder must be an integer');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate multiple field templates for duplicate positions
 * @param {Array} templates - Array of field templates
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export function validateFieldTemplates(templates) {
  const errors = {};
  const usedPositions = {};

  if (!Array.isArray(templates)) {
    return { isValid: false, errors: { general: ['Templates must be an array'] } };
  }

  templates.forEach((template, index) => {
    const templateErrors = [];
    const templateValidation = validateFieldTemplate(template);
    
    // Add individual template errors
    if (!templateValidation.isValid) {
      templateErrors.push(...templateValidation.errors);
    }

    // Check for duplicate positions within the same type
    if (template.fieldType && template.fieldIndex) {
      const positionKey = `${template.fieldType}_${template.fieldIndex}`;
      if (usedPositions[positionKey]) {
        templateErrors.push(VALIDATION_MESSAGES.DUPLICATE_POSITION(template.fieldIndex, template.fieldType));
      } else {
        usedPositions[positionKey] = true;
      }
    }

    if (templateErrors.length > 0) {
      errors[template.id || index] = templateErrors;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate field data value based on field type
 * @param {string} fieldType - Type of the field
 * @param {any} value - Value to validate
 * @param {boolean} required - Whether the field is required
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export function validateFieldData(fieldType, value, required = false) {
  // Handle required validation
  if (required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: VALIDATION_MESSAGES.REQUIRED };
  }

  // If not required and empty, it's valid
  if (!required && (value === null || value === undefined || value === '')) {
    return { isValid: true, error: null };
  }

  const rules = FIELD_VALIDATION_RULES[fieldType];
  if (!rules) {
    return { isValid: false, error: 'Unknown field type' };
  }

  switch (fieldType) {
    case FIELD_TYPES.TEXT:
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Value must be text' };
      }
      if (value.length > rules.maxLength) {
        return { isValid: false, error: VALIDATION_MESSAGES.TEXT_TOO_LONG(rules.maxLength) };
      }
      break;

    case FIELD_TYPES.TEXTAREA:
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Value must be text' };
      }
      if (value.length > rules.maxLength) {
        return { isValid: false, error: VALIDATION_MESSAGES.TEXT_TOO_LONG(rules.maxLength) };
      }
      break;

    case FIELD_TYPES.NUMBER:
      const numValue = parseFloat(value);
      if (isNaN(numValue) || !isFinite(numValue)) {
        return { isValid: false, error: VALIDATION_MESSAGES.NUMBER_INVALID };
      }
      if (numValue < rules.min || numValue > rules.max) {
        return { isValid: false, error: `Number must be between ${rules.min} and ${rules.max}` };
      }
      break;

    case FIELD_TYPES.DOCUMENT:
      if (typeof value !== 'string') {
        return { isValid: false, error: 'URL must be text' };
      }
      if (!rules.pattern.test(value)) {
        return { isValid: false, error: VALIDATION_MESSAGES.INVALID_URL };
      }
      break;

    case FIELD_TYPES.BOOLEAN:
      if (!rules.validValues.includes(value)) {
        return { isValid: false, error: VALIDATION_MESSAGES.BOOLEAN_INVALID };
      }
      break;

    default:
      return { isValid: false, error: 'Unknown field type' };
  }

  return { isValid: true, error: null };
}

/**
 * Validate form data against field templates
 * @param {Object} formData - Form data object
 * @param {Array} fieldTemplates - Array of field templates
 * @returns {Object} - { isValid: boolean, errors: Object }
 */
export function validateFormData(formData, fieldTemplates) {
  const errors = {};

  if (!Array.isArray(fieldTemplates)) {
    return { isValid: false, errors: { general: 'Field templates must be an array' } };
  }

  fieldTemplates.forEach(template => {
    const fieldKey = `field_${template.id}`;
    const value = formData[fieldKey];
    
    const validation = validateFieldData(template.fieldType, value, template.required);
    if (!validation.isValid) {
      errors[fieldKey] = validation.error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Get HTML input type for field type
 * @param {string} fieldType - Field type
 * @returns {string} - HTML input type
 */
export function getFieldInputType(fieldType) {
  if (!Object.values(FIELD_TYPES).includes(fieldType)) {
    return 'text';
  }
  return INPUT_TYPE_MAPPING[fieldType] || 'text';
}

/**
 * Check if field type can be added (within limits)
 * @param {Array} existingFields - Existing field templates
 * @param {string} fieldType - Field type to check
 * @returns {boolean} - Whether field type can be added
 */
export function canAddFieldType(existingFields, fieldType) {
  if (!Array.isArray(existingFields)) {
    return true;
  }

  const typeCount = existingFields.filter(field => field.fieldType === fieldType).length;
  return typeCount < MAX_FIELDS_PER_TYPE;
}

/**
 * Get field type counts from templates
 * @param {Array} templates - Field templates
 * @returns {Object} - Field type counts
 */
export function getFieldTypeCounts(templates) {
  const counts = {};
  
  Object.values(FIELD_TYPES).forEach(type => {
    counts[type] = 0;
  });

  if (Array.isArray(templates)) {
    templates.forEach(template => {
      if (template.fieldType && counts.hasOwnProperty(template.fieldType)) {
        counts[template.fieldType]++;
      }
    });
  }

  return counts;
}

/**
 * Find next available position for field type
 * @param {Array} existingFields - Existing field templates
 * @param {string} fieldType - Field type
 * @returns {number|null} - Next available position or null if none
 */
export function getNextAvailablePosition(existingFields, fieldType) {
  if (!Array.isArray(existingFields)) {
    return 1;
  }

  const usedPositions = existingFields
    .filter(field => field.fieldType === fieldType)
    .map(field => field.fieldIndex)
    .sort((a, b) => a - b);

  for (let i = 1; i <= MAX_FIELDS_PER_TYPE; i++) {
    if (!usedPositions.includes(i)) {
      return i;
    }
  }

  return null; // No available positions
}

/**
 * Normalize boolean value from form data
 * @param {any} value - Value to normalize
 * @returns {boolean} - Normalized boolean value
 */
export function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  
  if (typeof value === 'number') {
    return value === 1;
  }
  
  return false;
}

/**
 * Create default field template
 * @param {string} fieldType - Field type
 * @param {number} position - Field position
 * @returns {Object} - Default field template
 */
export function createDefaultFieldTemplate(fieldType, position) {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: '',
    description: '',
    fieldType,
    fieldIndex: position,
    isVisible: true,
    displayOrder: 0
  };
}