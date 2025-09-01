'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, checkUserAdminStatus } from '@/lib/utils/auth-utils';

/**
 * Process and sanitize search query for PostgreSQL full-text search
 * Converts user input to safe tsquery format
 */
export async function processSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return null;
  }

  const trimmedQuery = query.trim();
  
  // Validate query length
  if (trimmedQuery.length < 2) {
    throw new Error('Search query must be at least 2 characters long');
  }
  
  if (trimmedQuery.length > 200) {
    throw new Error('Search query must be less than 200 characters');
  }

  // Handle quoted phrases - preserve them as-is
  const quotedPhrases = [];
  let processedQuery = trimmedQuery.replace(/"([^"]+)"/g, (match, phrase) => {
    const placeholder = `__QUOTED_${quotedPhrases.length}__`;
    quotedPhrases.push(`"${phrase}"`);
    return placeholder;
  });

  // Remove special characters that could cause issues, keep alphanumeric, spaces, and basic punctuation
  processedQuery = processedQuery.replace(/[^\w\s\-_]/g, ' ');
  
  // Split into words and filter out empty strings
  const words = processedQuery.split(/\s+/).filter(word => word.length > 0);
  
  // Replace placeholders with quoted phrases
  const finalWords = words.map(word => {
    const match = word.match(/__QUOTED_(\d+)__/);
    if (match) {
      const index = parseInt(match[1]);
      return quotedPhrases[index] || word;
    }
    return word;
  });
  
  if (finalWords.length === 0) {
    throw new Error('Search query contains no valid terms');
  }
  
  // Join words with & operator for AND search
  return finalWords.join(' & ');
}

/**
 * Get accessible inventory IDs for a user based on permissions
 * Returns array of inventory IDs the user can access
 */
export async function getAccessibleInventoryIds(user, supabase) {
  if (!user) {
    // Unauthenticated users can only access public inventories
    const { data: publicInventories, error } = await supabase
      .from('inventories')
      .select('id')
      .eq('isPublic', true);
    
    if (error) {
      console.error('Error fetching public inventories:', error);
      return [];
    }
    
    return publicInventories.map(inv => inv.id);
  }
  
  // Check if user is admin
  const { isAdmin } = await checkUserAdminStatus(user.id, supabase);
  
  if (isAdmin) {
    // Admin users have access to all inventories
    const { data: allInventories, error } = await supabase
      .from('inventories')
      .select('id');
    
    if (error) {
      console.error('Error fetching all inventories for admin:', error);
      return [];
    }
    
    return allInventories.map(inv => inv.id);
  }
  
  // Regular authenticated user: get owned + public + explicitly granted access
  // First get owned inventories
  const { data: ownedInventories, error: ownedError } = await supabase
    .from('inventories')
    .select('id')
    .eq('ownerId', user.id);
  
  // Then get public inventories
  const { data: publicInventories, error: publicError } = await supabase
    .from('inventories')
    .select('id')
    .eq('isPublic', true);
  
  // Then get inventories with explicit access
  const { data: accessGranted, error: accessError } = await supabase
    .from('access')
    .select('inventoryId')
    .eq('userId', user.id);
  
  if (ownedError || publicError || accessError) {
    console.error('Error fetching accessible inventories:', ownedError || publicError || accessError);
    return [];
  }
  
  // Combine all accessible inventory IDs
  const allIds = [
    ...(ownedInventories || []).map(inv => inv.id),
    ...(publicInventories || []).map(inv => inv.id),
    ...(accessGranted || []).map(access => access.inventoryId)
  ];
  
  // Remove duplicates
  const uniqueIds = [...new Set(allIds)];
  return uniqueIds;
}

/**
 * Global search across both inventories and items
 * Returns combined results with permission filtering
 */
export async function globalSearchAction(query, options = {}) {
  try {
    // Validate and process query
    if (!query || !query.trim()) {
      return {
        success: true,
        inventories: [],
        items: [],
        total: 0
      };
    }
    
    const processedQuery = await processSearchQuery(query);
    const limit = Math.min(options.limit || 20, 100); // Max 100 results
    
    const supabase = await createClient();
    
    // Get authenticated user (optional)
    let user = null;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      // User not authenticated - continue with public access only
    }
    
    // Get accessible inventory IDs
    const accessibleInventoryIds = await getAccessibleInventoryIds(user, supabase);
    
    if (accessibleInventoryIds.length === 0) {
      return {
        success: true,
        inventories: [],
        items: [],
        total: 0
      };
    }
    
    // Search inventories
    const { data: inventories, error: inventoryError } = await supabase
      .rpc('search_inventories', {
        search_query: processedQuery,
        accessible_ids: accessibleInventoryIds,
        result_limit: Math.ceil(limit / 2)
      });
    
    if (inventoryError) {
      console.error('Error searching inventories:', inventoryError);
    }
    
    // Search items
    const { data: items, error: itemError } = await supabase
      .rpc('search_items', {
        search_query: processedQuery,
        accessible_inventory_ids: accessibleInventoryIds,
        result_limit: Math.ceil(limit / 2)
      });
    
    if (itemError) {
      console.error('Error searching items:', itemError);
    }
    
    const inventoryResults = inventories || [];
    const itemResults = items || [];
    
    return {
      success: true,
      inventories: inventoryResults,
      items: itemResults,
      total: inventoryResults.length + itemResults.length
    };
    
  } catch (error) {
    console.error('Error in global search:', error);
    return {
      success: false,
      error: `Search failed: ${error.message}`,
      inventories: [],
      items: [],
      total: 0
    };
  }
}

/**
 * Search inventories with pagination and sorting
 * Dedicated inventory search with detailed results
 */
export async function searchInventoriesAction(query, options = {}) {
  try {
    // Validate and process query
    if (!query || !query.trim()) {
      return {
        success: true,
        inventories: [],
        total: 0,
        page: options.page || 1
      };
    }
    
    const processedQuery = await processSearchQuery(query);
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'relevance'; // relevance, date, alphabetical
    
    const supabase = await createClient();
    
    // Get authenticated user (optional)
    let user = null;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      // User not authenticated - continue with public access only
    }
    
    // Get accessible inventory IDs
    const accessibleInventoryIds = await getAccessibleInventoryIds(user, supabase);
    
    if (accessibleInventoryIds.length === 0) {
      return {
        success: true,
        inventories: [],
        total: 0,
        page
      };
    }
    
    // Build sort clause
    let orderClause = 'ts_rank(search_vector, to_tsquery(\'english\', $1)) DESC';
    if (sortBy === 'date') {
      orderClause = 'created_at DESC';
    } else if (sortBy === 'alphabetical') {
      orderClause = 'title ASC';
    }
    
    // Search inventories with full details using textSearch
    const { data: inventories, error } = await supabase
      .from('inventories')
      .select(`
        id,
        title,
        description,
        image,
        isPublic,
        createdAt,
        updatedAt,
        owner:ownerId(
          id,
          name,
          email
        ),
        category:categoryId(
          id,
          name,
          description
        )
      `)
      .textSearch('search_vector', processedQuery, {
        type: 'websearch',
        config: 'english'
      })
      .in('id', accessibleInventoryIds)
      .range(offset, offset + limit - 1)
      .order('createdAt', { ascending: sortBy !== 'date' });
    
    if (error) {
      console.error('Error searching inventories:', error);
      return {
        success: false,
        error: `Inventory search failed: ${error.message}`,
        inventories: [],
        total: 0,
        page
      };
    }
    
    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('inventories')
      .select('*', { count: 'exact', head: true })
      .textSearch('search_vector', processedQuery, {
        type: 'websearch',
        config: 'english'
      })
      .in('id', accessibleInventoryIds);
    
    if (countError) {
      console.error('Error getting inventory count:', countError);
    }
    
    return {
      success: true,
      inventories: inventories || [],
      total: totalCount || 0,
      page
    };
    
  } catch (error) {
    console.error('Error in inventory search:', error);
    return {
      success: false,
      error: `Inventory search failed: ${error.message}`,
      inventories: [],
      total: 0,
      page: options.page || 1
    };
  }
}

/**
 * Search items with pagination and inventory context
 * Dedicated item search with parent inventory information
 */
export async function searchItemsAction(query, options = {}) {
  try {
    // Validate and process query
    if (!query || !query.trim()) {
      return {
        success: true,
        items: [],
        total: 0,
        page: options.page || 1
      };
    }
    
    const processedQuery = await processSearchQuery(query);
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;
    const inventoryId = options.inventoryId; // Optional filter by specific inventory
    
    const supabase = await createClient();
    
    // Get authenticated user (optional)
    let user = null;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      // User not authenticated - continue with public access only
    }
    
    // Get accessible inventory IDs
    let accessibleInventoryIds = await getAccessibleInventoryIds(user, supabase);
    
    // Filter by specific inventory if provided
    if (inventoryId) {
      if (!accessibleInventoryIds.includes(inventoryId)) {
        return {
          success: false,
          error: 'Access denied to specified inventory',
          items: [],
          total: 0,
          page
        };
      }
      accessibleInventoryIds = [inventoryId];
    }
    
    if (accessibleInventoryIds.length === 0) {
      return {
        success: true,
        items: [],
        total: 0,
        page
      };
    }
    
    // Search items with inventory context using textSearch
    const { data: items, error } = await supabase
      .from('items')
      .select(`
        id,
        customId,
        text1,
        text2,
        text3,
        textArea1,
        textArea2,
        num1,
        num2,
        num3,
        doc1,
        doc2,
        doc3,
        bool1,
        bool2,
        bool3,
        createdAt,
        updatedAt,
        inventory:inventoryId(
          id,
          title,
          description,
          isPublic,
          owner:ownerId(
            id,
            name,
            email
          )
        ),
        createdBy:createdById(
          id,
          name,
          email
        )
      `)
      .textSearch('search_vector', processedQuery, {
        type: 'websearch',
        config: 'english'
      })
      .in('inventoryId', accessibleInventoryIds)
      .range(offset, offset + limit - 1)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error searching items:', error);
      return {
        success: false,
        error: `Item search failed: ${error.message}`,
        items: [],
        total: 0,
        page
      };
    }
    
    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .textSearch('search_vector', processedQuery, {
        type: 'websearch',
        config: 'english'
      })
      .in('inventoryId', accessibleInventoryIds);
    
    if (countError) {
      console.error('Error getting item count:', countError);
    }
    
    return {
      success: true,
      items: items || [],
      total: totalCount || 0,
      page
    };
    
  } catch (error) {
    console.error('Error in item search:', error);
    return {
      success: false,
      error: `Item search failed: ${error.message}`,
      items: [],
      total: 0,
      page: options.page || 1
    };
  }
}

/**
 * Quick search for autocomplete/suggestions
 * Returns limited results for fast response
 */
export async function quickSearchAction(query, options = {}) {
  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        suggestions: []
      };
    }
    
    const processedQuery = await processSearchQuery(query);
    const limit = Math.min(options.limit || 10, 20); // Smaller limit for quick search
    
    const supabase = await createClient();
    
    // Get authenticated user (optional)
    let user = null;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      // User not authenticated - continue with public access only
    }
    
    // Get accessible inventory IDs
    const accessibleInventoryIds = await getAccessibleInventoryIds(user, supabase);
    
    if (accessibleInventoryIds.length === 0) {
      return {
        success: true,
        suggestions: []
      };
    }
    
    // Get quick results from both inventories and items using raw SQL
    const inventoryLimit = Math.ceil(limit / 2);
    const itemLimit = Math.ceil(limit / 2);
    
    const [inventoryResults, itemResults] = await Promise.all([
      supabase.rpc('search_inventories_quick', {
        search_query: processedQuery,
        accessible_ids: accessibleInventoryIds,
        result_limit: inventoryLimit
      }),
      
      supabase.rpc('search_items_quick', {
        search_query: processedQuery,
        accessible_inventory_ids: accessibleInventoryIds,
        result_limit: itemLimit
      })
    ]);
    
    // Fallback to direct queries if RPC functions don't exist
    let inventoryData = inventoryResults.data;
    let itemData = itemResults.data;
    
    if (inventoryResults.error || !inventoryData) {
      const { data } = await supabase
        .from('inventories')
        .select('id, title, description')
        .textSearch('search_vector', processedQuery, {
          type: 'websearch',
          config: 'english'
        })
        .in('id', accessibleInventoryIds)
        .limit(inventoryLimit);
      inventoryData = data;
    }
    
    if (itemResults.error || !itemData) {
      const { data } = await supabase
        .from('items')
        .select(`
          id,
          customId,
          text1,
          inventory:inventoryId(
            id,
            title
          )
        `)
        .textSearch('search_vector', processedQuery, {
          type: 'websearch',
          config: 'english'
        })
        .in('inventoryId', accessibleInventoryIds)
        .limit(itemLimit);
      itemData = data;
    }
    
    const suggestions = [];
    
    // Add inventory suggestions
    if (inventoryData) {
      inventoryData.forEach(inv => {
        suggestions.push({
          type: 'inventory',
          id: inv.id,
          title: inv.title,
          description: inv.description
        });
      });
    }
    
    // Add item suggestions
    if (itemData) {
      itemData.forEach(item => {
        suggestions.push({
          type: 'item',
          id: item.id,
          title: item.customId || item.text1 || 'Untitled Item',
          description: `In ${item.inventory?.title || 'Unknown Inventory'}`,
          inventoryId: item.inventory?.id
        });
      });
    }
    
    return {
      success: true,
      suggestions: suggestions.slice(0, limit)
    };
    
  } catch (error) {
    console.error('Error in quick search:', error);
    return {
      success: false,
      error: `Quick search failed: ${error.message}`,
      suggestions: []
    };
  }
}