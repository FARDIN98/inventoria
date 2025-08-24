'use server'

import { createClient } from '@/lib/supabase/server'

// Get home page data: latest inventories, popular inventories, and tag cloud
export async function getHomeDataAction() {
  try {
    const supabase = await createClient()

    // Get latest 10 inventories
    const { data: latestInventories, error: latestError } = await supabase
      .from('inventories')
      .select(`
        id,
        title,
        description,
        image,
        createdAt,
        categories:categoryId(name),
        users:ownerId(name, email)
      `)
      .eq('isPublic', true)
      .order('createdAt', { ascending: false })
      .limit(10)

    if (latestError) {
      console.error('Error fetching latest inventories:', latestError)
    }

    // Get top 5 popular inventories by item count
    const { data: popularInventories, error: popularError } = await supabase
      .from('inventories')
      .select(`
        id,
        title,
        description,
        image,
        createdAt,
        categories:categoryId(name),
        users:ownerId(name, email),
        items(id)
      `)
      .eq('isPublic', true)
      .order('createdAt', { ascending: false })
      .limit(20)

    if (popularError) {
      console.error('Error fetching popular inventories:', popularError)
    }

    // Get tag cloud data - tags with usage count
    const { data: tagCloudData, error: tagError } = await supabase
      .from('tags')
      .select(`
        id,
        name,
        inventory_tags(
          inventoryId
        )
      `)
      .limit(30)

    if (tagError) {
      console.error('Error fetching tag cloud data:', tagError)
    }

    // Process popular inventories to sort by item count
    const processedPopularInventories = (popularInventories || [])
      .map(inventory => ({
        ...inventory,
        itemCount: inventory.items?.length || 0
      }))
      .sort((a, b) => b.itemCount - a.itemCount)
      .slice(0, 5) // Take top 5

    // Process tag cloud data to include usage counts and sort by count
    const processedTags = (tagCloudData?.map(tag => ({
      id: tag.id,
      name: tag.name,
      count: tag.inventory_tags?.length || 0
    })) || [])
    .filter(tag => tag.count > 0) // Only show tags that are actually used
    .sort((a, b) => b.count - a.count) // Sort by count descending

    return {
      success: true,
      data: {
        latestInventories: latestInventories || [],
        popularInventories: processedPopularInventories,
        tagCloud: processedTags
      }
    }

  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      success: false,
      error: 'Failed to fetch home page data',
      data: {
        latestInventories: [],
        popularInventories: [],
        tagCloud: []
      }
    }
  }
}

// Get all inventories for search (will be used later)
export async function searchInventoriesAction(query = '', tag = '') {
  try {
    const supabase = await createClient()
    
    let queryBuilder = supabase
      .from('inventories')
      .select(`
        id,
        title,
        description,
        image,
        createdAt,
        categories:categoryId(name),
        users:ownerId(name, email),
        inventory_tags(
          tags(name)
        )
      `)
      .eq('isPublic', true)

    // Add text search if query provided
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Add tag filter if tag provided
    if (tag.trim()) {
      queryBuilder = queryBuilder.eq('inventory_tags.tags.name', tag.toLowerCase())
    }

    const { data: inventories, error } = await queryBuilder
      .order('createdAt', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error searching inventories:', error)
      return { success: false, error: 'Search failed', inventories: [] }
    }

    return { success: true, inventories: inventories || [] }

  } catch (error) {
    console.error('Error searching inventories:', error)
    return { success: false, error: 'Search failed', inventories: [] }
  }
}