"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { quickSearchAction } from "@/lib/search-actions"
import { SearchSuggestions } from "./SearchSuggestions"
import { cn } from "@/lib/utils"

/**
 * Advanced SearchInput component with debounced API calls and real-time suggestions
 * Integrates with Phase 2 search server actions for optimal performance
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.placeholder - Input placeholder text
 * @param {Function} props.onSearch - Callback when search is performed
 * @returns {JSX.Element} Enhanced search input with suggestions dropdown
 */
export function SearchInput({ className, placeholder, onSearch, ...props }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    
    try {
      const result = await quickSearchAction(searchQuery.trim(), { 
        limit: 10,
        signal: abortControllerRef.current.signal 
      })
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      if (result.success) {
        setSuggestions(result.suggestions || [])
        setIsOpen(result.suggestions?.length > 0)
        setSelectedIndex(-1)
      } else {
        console.error('Search error:', result.error)
        setSuggestions([])
        setIsOpen(false)
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search request failed:', error)
      }
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debouncing
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    setQuery(value)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      debouncedSearch(value)
    }, 300)
  }, [debouncedSearch])

  // Handle clear search
  const handleClear = useCallback(() => {
    setQuery("")
    setSuggestions([])
    setIsOpen(false)
    setSelectedIndex(-1)
    setIsLoading(false)
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Clear debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    // Focus input
    inputRef.current?.focus()
  }, [])

  // Handle search submission
  const handleSearch = useCallback((searchQuery = query) => {
    if (!searchQuery || searchQuery.trim().length < 2) return
    
    const trimmedQuery = searchQuery.trim()
    setIsOpen(false)
    
    // Navigate to search results page
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
    
    // Call onSearch callback if provided
    if (onSearch) {
      onSearch(trimmedQuery)
    }
  }, [query, router, onSearch])

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion) => {
    setIsOpen(false)
    setQuery(suggestion.title)
    
    // Navigate to specific page based on suggestion type
    if (suggestion.type === 'inventory') {
      router.push(`/inventory/${suggestion.id}`)
    } else if (suggestion.type === 'item') {
      // Navigate to parent inventory with item highlighted
      router.push(`/inventory/${suggestion.inventoryId || suggestion.id}?item=${suggestion.id}`)
    }
  }, [router])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSearch()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1)
        break
      
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex])
        } else {
          handleSearch()
        }
        break
      
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
      
      case 'Tab':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }, [isOpen, suggestions, selectedIndex, handleSearch, handleSuggestionSelect])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="relative w-full" ref={inputRef}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        
        {/* Search Input */}
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('search.placeholder', 'Search inventories...')}
          className={cn("pl-10 pr-10", className)}
          aria-label={t('search.ariaLabel', 'Search inventories')}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `search-option-${selectedIndex}` : undefined}
          {...props}
        />
        
        {/* Clear Button */}
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-muted"
            onClick={handleClear}
            aria-label={t('search.clear', 'Clear search')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Search Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <SearchSuggestions
          suggestions={suggestions}
          query={query}
          selectedIndex={selectedIndex}
          onSelect={handleSuggestionSelect}
          onViewAll={() => handleSearch()}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}