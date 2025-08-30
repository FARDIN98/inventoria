/**
 * Supported element types for custom ID generation
 */
export const ELEMENT_TYPES = {
  FIXED_TEXT: 'FIXED_TEXT',
  RANDOM_20BIT: 'RANDOM_20BIT',
  RANDOM_32BIT: 'RANDOM_32BIT', 
  RANDOM_6DIGIT: 'RANDOM_6DIGIT',
  RANDOM_9DIGIT: 'RANDOM_9DIGIT',
  GUID: 'GUID',
  DATETIME: 'DATETIME',
  SEQUENCE: 'SEQUENCE'
}

/**
 * Default datetime format patterns
 */
export const DATETIME_FORMATS = {
  YYYY: 'YYYY',
  MM: 'MM',
  DD: 'DD',
  HH: 'HH',
  mm: 'mm',
  ss: 'ss',
  YYYYMMDD: 'YYYYMMDD',
  HHMMSS: 'HHMMSS',
  YYYYMMDDHHMMSS: 'YYYYMMDDHHMMSS'
}