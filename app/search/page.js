"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, Package, FileText, Filter, SortAsc, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { searchInventoriesAction, searchItemsAction } from "@/lib/search-actions"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Dedicated search results page with comprehensive filtering and pagination
 * Handles URL query parameters and provides detailed search results
 * 
 * @returns {JSX.Element} Complete search results page
 */
export default function SearchPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  // State management
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Results state
  const [inventoryResults, setInventoryResults] = useState({ inventories: [], total: 0 })
  const [itemResults, setItemResults] = useState({ items: [], total: 0 })
  
  const itemsPerPage = 20

  // Perform search
  const performSearch = useCallback(async (searchQuery, page = 1, sort = sortBy) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setInventoryResults({ inventories: [], total: 0 })
      setItemResults({ items: [], total: 0 })
      return
    }

    setIsLoading(true)
    
    try {
      const [inventoryResponse, itemResponse] = await Promise.all([
        searchInventoriesAction(searchQuery, {
          page: activeTab === 'inventories' ? page : 1,
          limit: itemsPerPage,
          sortBy: sort
        }),
        searchItemsAction(searchQuery, {
          page: activeTab === 'items' ? page : 1,
          limit: itemsPerPage
        })
      ])

      if (inventoryResponse.success) {
        setInventoryResults({
          inventories: inventoryResponse.inventories || [],
          total: inventoryResponse.total || 0
        })
      }

      if (itemResponse.success) {
        setItemResults({
          items: itemResponse.items || [],
          total: itemResponse.total || 0
        })
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, sortBy, itemsPerPage])

  // Handle search input change
  const handleSearchChange = (e) => {
    setQuery(e.target.value)
  }

  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setCurrentPage(1)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      performSearch(query.trim(), 1)
    }
  }

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  // Handle sort change
  const handleSortChange = (sort) => {
    setSortBy(sort)
    setCurrentPage(1)
    performSearch(query, 1, sort)
  }

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page)
    performSearch(query, page)
  }

  // Calculate pagination info
  const getTotalResults = () => {
    if (activeTab === 'inventories') return inventoryResults.total
    if (activeTab === 'items') return itemResults.total
    return inventoryResults.total + itemResults.total
  }

  const getTotalPages = () => {
    const total = getTotalResults()
    return Math.ceil(total / itemsPerPage)
  }

  // Initial search on mount and query change
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery, performSearch])

  // Highlight search terms in text
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {t('search.pageTitle', 'Search Results')}
        </h1>
        
        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={handleSearchChange}
              placeholder={t('search.placeholder', 'Search inventories...')}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {t('search.search', 'Search')}
          </Button>
        </form>
        
        {/* Results Summary */}
        {query && (
          <div className="text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <span>
                {t('search.resultsFor', 'Results for "{{query}}"', { query })}
                {getTotalResults() > 0 && (
                  <span className="ml-2">
                    ({t('search.totalResults', '{{count}} results', { count: getTotalResults() })})
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              {t('search.all', 'All')} ({inventoryResults.total + itemResults.total})
            </TabsTrigger>
            <TabsTrigger value="inventories">
              <Package className="h-4 w-4 mr-1" />
              {t('search.inventories', 'Inventories')} ({inventoryResults.total})
            </TabsTrigger>
            <TabsTrigger value="items">
              <FileText className="h-4 w-4 mr-1" />
              {t('search.items', 'Items')} ({itemResults.total})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">{t('search.sortRelevance', 'Relevance')}</SelectItem>
              <SelectItem value="date">{t('search.sortDate', 'Date')}</SelectItem>
              <SelectItem value="alphabetical">{t('search.sortAlphabetical', 'Alphabetical')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-6">
        {isLoading ? (
          // Loading skeletons
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* All Results Tab */}
            {activeTab === 'all' && (
              <div className="space-y-6">
                {/* Inventories Section */}
                {inventoryResults.inventories.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      {t('search.inventories', 'Inventories')}
                    </h2>
                    <div className="grid gap-4">
                      {inventoryResults.inventories.slice(0, 5).map((inventory) => (
                        <Card key={inventory.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <Link 
                                href={`/inventory/${inventory.id}`}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {highlightText(inventory.title, query)}
                              </Link>
                              {inventory.isPublic && (
                                <Badge variant="secondary">{t('common.public', 'Public')}</Badge>
                              )}
                            </CardTitle>
                            {inventory.description && (
                              <CardDescription>
                                {highlightText(inventory.description, query)}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{t('inventory.owner', 'Owner')}: {inventory.owner?.name || inventory.owner?.email}</span>
                              {inventory.category && (
                                <span>{t('inventory.category', 'Category')}: {inventory.category.name}</span>
                              )}
                              <span>{t('inventory.created', 'Created')}: {new Date(inventory.createdAt).toLocaleDateString()}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Items Section */}
                {itemResults.items.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-500" />
                      {t('search.items', 'Items')}
                    </h2>
                    <div className="grid gap-4">
                      {itemResults.items.slice(0, 5).map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <CardTitle>
                              <Link 
                                href={`/inventory/${item.inventory.id}?item=${item.id}`}
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                              >
                                {highlightText(item.customId || item.text1 || 'Untitled Item', query)}
                              </Link>
                            </CardTitle>
                            <CardDescription>
                              {t('item.inInventory', 'In inventory')}: 
                              <Link 
                                href={`/inventory/${item.inventory.id}`}
                                className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {item.inventory.title}
                              </Link>
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {item.text1 && (
                                <div className="text-sm">
                                  <span className="font-medium">{t('item.text1', 'Text 1')}: </span>
                                  {highlightText(item.text1, query)}
                                </div>
                              )}
                              {item.textArea1 && (
                                <div className="text-sm">
                                  <span className="font-medium">{t('item.description', 'Description')}: </span>
                                  {highlightText(item.textArea1.substring(0, 200), query)}
                                  {item.textArea1.length > 200 && '...'}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {t('item.created', 'Created')}: {new Date(item.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* No Results */}
                {inventoryResults.inventories.length === 0 && itemResults.items.length === 0 && query && (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {t('search.noResults', 'No results found')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('search.noResultsDescription', 'Try adjusting your search terms or browse all inventories.')}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Inventories Only Tab */}
            {activeTab === 'inventories' && (
              <div className="grid gap-4">
                {inventoryResults.inventories.map((inventory) => (
                  <Card key={inventory.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <Link 
                          href={`/inventory/${inventory.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {highlightText(inventory.title, query)}
                        </Link>
                        {inventory.isPublic && (
                          <Badge variant="secondary">{t('common.public', 'Public')}</Badge>
                        )}
                      </CardTitle>
                      {inventory.description && (
                        <CardDescription>
                          {highlightText(inventory.description, query)}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{t('inventory.owner', 'Owner')}: {inventory.owner?.name || inventory.owner?.email}</span>
                        {inventory.category && (
                          <span>{t('inventory.category', 'Category')}: {inventory.category.name}</span>
                        )}
                        <span>{t('inventory.created', 'Created')}: {new Date(inventory.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Items Only Tab */}
            {activeTab === 'items' && (
              <div className="grid gap-4">
                {itemResults.items.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle>
                        <Link 
                          href={`/inventory/${item.inventory.id}?item=${item.id}`}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        >
                          {highlightText(item.customId || item.text1 || 'Untitled Item', query)}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {t('item.inInventory', 'In inventory')}: 
                        <Link 
                          href={`/inventory/${item.inventory.id}`}
                          className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {item.inventory.title}
                        </Link>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {item.text1 && (
                          <div className="text-sm">
                            <span className="font-medium">{t('item.text1', 'Text 1')}: </span>
                            {highlightText(item.text1, query)}
                          </div>
                        )}
                        {item.textArea1 && (
                          <div className="text-sm">
                            <span className="font-medium">{t('item.description', 'Description')}: </span>
                            {highlightText(item.textArea1.substring(0, 200), query)}
                            {item.textArea1.length > 200 && '...'}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {t('item.created', 'Created')}: {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {getTotalPages() > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('pagination.previous', 'Previous')}
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  disabled={isLoading}
                >
                  {page}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === getTotalPages() || isLoading}
          >
            {t('pagination.next', 'Next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}