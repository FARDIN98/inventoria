import React from 'react'
import remarkGfm from 'remark-gfm'

/**
 * Get user initials for avatar fallback
 * @param {string} name - User's full name
 * @returns {string} - User initials (max 2 characters)
 */
export const getUserInitials = (name) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Shared markdown components for ReactMarkdown
 * Provides consistent styling and security across all discussion components
 */
export const markdownComponents = {
  // Prevent external links from opening in same tab
  a: ({ href, children, ...props }) => {
    const isExternal = href && (href.startsWith('http') || href.startsWith('https'))
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-primary hover:underline"
        {...props}
      >
        {children}
      </a>
    )
  },
  
  // Style code blocks
  code: ({ inline, children, ...props }) => {
    if (inline) {
      return (
        <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-muted p-3 rounded-md overflow-x-auto">
        <code className="text-sm font-mono" {...props}>
          {children}
        </code>
      </pre>
    )
  },
  
  // Style blockquotes
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground" {...props}>
      {children}
    </blockquote>
  ),
  
  // Style lists
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside space-y-1" {...props}>
      {children}
    </ul>
  ),
  
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside space-y-1" {...props}>
      {children}
    </ol>
  ),
  
  // Style headings
  h1: ({ children, ...props }) => (
    <h1 className="text-xl font-bold mt-4 mb-2" {...props}>
      {children}
    </h1>
  ),
  
  h2: ({ children, ...props }) => (
    <h2 className="text-lg font-semibold mt-3 mb-2" {...props}>
      {children}
    </h2>
  ),
  
  h3: ({ children, ...props }) => (
    <h3 className="text-base font-medium mt-2 mb-1" {...props}>
      {children}
    </h3>
  ),
  
  // Style paragraphs
  p: ({ children, ...props }) => (
    <p className="mb-2" {...props}>
      {children}
    </p>
  ),
  
  // Style pre blocks (for code blocks without language)
  pre: ({ children, ...props }) => (
    <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-2" {...props}>
      {children}
    </pre>
  )
}

/**
 * Default remarkGfm plugins for markdown processing
 */
export const remarkPlugins = [remarkGfm]

/**
 * Common markdown processing options
 */
export const markdownOptions = {
  remarkPlugins,
  components: markdownComponents
}

/**
 * Check if user can delete a post
 * @param {Object} currentUser - Current authenticated user
 * @param {Object} post - Post object
 * @returns {boolean} - Whether user can delete the post
 */
export const canDeletePost = (currentUser, post) => {
  if (!currentUser) return false
  
  return (
    currentUser.id === post.authorId || 
    currentUser.role === 'ADMIN' ||
    post.isOptimistic // Can always delete optimistic posts
  )
}

/**
 * Format relative time for post timestamps
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} - Formatted relative time
 */
export const formatRelativeTime = (timestamp) => {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) {
      return 'just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    } else {
      return date.toLocaleDateString()
    }
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return 'unknown'
  }
}

/**
 * Validate post content
 * @param {string} content - Post content to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {Object} - Validation result { isValid: boolean, error?: string }
 */
export const validatePostContent = (content, maxLength = 10000) => {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Content is required' }
  }
  
  const trimmedContent = content.trim()
  
  if (trimmedContent.length === 0) {
    return { isValid: false, error: 'Content cannot be empty' }
  }
  
  if (trimmedContent.length > maxLength) {
    return { isValid: false, error: `Content cannot exceed ${maxLength} characters` }
  }
  
  return { isValid: true }
}

/**
 * Generate optimistic post object
 * @param {string} inventoryId - Inventory ID
 * @param {string} content - Post content
 * @param {Object} currentUser - Current user object
 * @returns {Object} - Optimistic post object
 */
export const createOptimisticPost = (inventoryId, content, currentUser = null) => {
  const tempId = `temp_${Date.now()}_${Math.random()}`
  
  return {
    id: tempId,
    tempId,
    inventoryId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: currentUser || {
      id: 'current-user',
      name: 'You',
      email: '',
      image: null
    },
    isOptimistic: true
  }
}

/**
 * Connection state helpers
 */
export const CONNECTION_STATES = {
  LOADING: 'loading',
  CONNECTED: 'connected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected'
}

/**
 * Check if connection state indicates loading
 * @param {string} state - Connection state
 * @returns {boolean}
 */
export const isLoadingState = (state) => state === CONNECTION_STATES.LOADING

/**
 * Check if connection state indicates connected
 * @param {string} state - Connection state
 * @returns {boolean}
 */
export const isConnectedState = (state) => state === CONNECTION_STATES.CONNECTED

/**
 * Check if connection state indicates error
 * @param {string} state - Connection state
 * @returns {boolean}
 */
export const isErrorState = (state) => state === CONNECTION_STATES.ERROR

/**
 * Check if connection state indicates reconnecting
 * @param {string} state - Connection state
 * @returns {boolean}
 */
export const isReconnectingState = (state) => state === CONNECTION_STATES.RECONNECTING