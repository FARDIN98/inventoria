"use client"

import { useMemo } from "react"
import { Package, FileText, ArrowRight } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/**
 * SearchSuggestions dropdown component with grouped results
 * Displays inventories and items in separate sections with highlighting
 * 
 * @param {Object} props - Component props
 * @param {Array} props.suggestions - Array of search suggestions
 * @param {string} props.query - Current search query for highlighting
 * @param {number} props.selectedIndex - Currently selected suggestion index
 * @param {Function} props.onSelect - Callback when suggestion is selected
 * @param {Function} props.onViewAll - Callback for "View all results" action
 * @param {Function} props.onClose - Callback to close the dropdown
 * @returns {JSX.Element} Command palette style suggestions dropdown
 */
export function SearchSuggestions({
  suggestions,
  query,
  selectedIndex,
  onSelect,
  onViewAll,
  onClose
}) {
  const { t } = useTranslation()

  // Group suggestions by type
  const groupedSuggestions = useMemo(() => {
    const inventories = suggestions.filter(s => s.type === 'inventory').slice(0, 5)
    const items = suggestions.filter(s => s.type === 'item').slice(0, 5)
    
    return { inventories, items }
  }, [suggestions])

  // Highlight matching text in suggestion titles
  const highlightText = (text, searchQuery) => {
    if (!text || !searchQuery) return text
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 text-foreground">
            {part}
          </mark>
        )
      }
      return part
    })
  }

  // Calculate total suggestions for accessibility
  const totalSuggestions = groupedSuggestions.inventories.length + groupedSuggestions.items.length
  
  // Get flat array for keyboard navigation
  const flatSuggestions = [
    ...groupedSuggestions.inventories,
    ...groupedSuggestions.items
  ]

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg">
      <Command className="max-h-[400px]">
        <CommandList>
          {totalSuggestions === 0 ? (
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {t('search.noResults', 'No results found')}
            </CommandEmpty>
          ) : (
            <>
              {/* Screen reader announcement */}
              <div className="sr-only" aria-live="polite">
                {t('search.resultsFound', '{{count}} results found', { count: totalSuggestions })}
              </div>
              
              {/* Inventories Section */}
              {groupedSuggestions.inventories.length > 0 && (
                <CommandGroup heading={t('search.inventories', 'Inventories')}>
                  {groupedSuggestions.inventories.map((suggestion, index) => {
                    const globalIndex = index
                    const isSelected = selectedIndex === globalIndex
                    
                    return (
                      <CommandItem
                        key={`inventory-${suggestion.id}`}
                        id={`search-option-${globalIndex}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer",
                          isSelected && "bg-accent text-accent-foreground"
                        )}
                        onSelect={() => onSelect(suggestion)}
                        aria-selected={isSelected}
                      >
                        <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {highlightText(suggestion.title, query)}
                          </div>
                          {suggestion.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {highlightText(suggestion.description, query)}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
              
              {/* Separator between sections */}
              {groupedSuggestions.inventories.length > 0 && groupedSuggestions.items.length > 0 && (
                <CommandSeparator />
              )}
              
              {/* Items Section */}
              {groupedSuggestions.items.length > 0 && (
                <CommandGroup heading={t('search.items', 'Items')}>
                  {groupedSuggestions.items.map((suggestion, index) => {
                    const globalIndex = groupedSuggestions.inventories.length + index
                    const isSelected = selectedIndex === globalIndex
                    
                    return (
                      <CommandItem
                        key={`item-${suggestion.id}`}
                        id={`search-option-${globalIndex}`}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer",
                          isSelected && "bg-accent text-accent-foreground"
                        )}
                        onSelect={() => onSelect(suggestion)}
                        aria-selected={isSelected}
                      >
                        <FileText className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {highlightText(suggestion.title, query)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {highlightText(suggestion.description, query)}
                          </div>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
              
              {/* View All Results */}
              {totalSuggestions > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      className="flex items-center justify-center gap-2 px-3 py-2 cursor-pointer text-primary font-medium"
                      onSelect={onViewAll}
                    >
                      <ArrowRight className="h-4 w-4" />
                      {t('search.viewAllResults', 'View all results for "{{query}}"', { query })}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </div>
  )
}