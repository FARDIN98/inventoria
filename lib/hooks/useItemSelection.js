'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing item selection state in tables
 * Provides functionality for checkbox-based item selection with batch operations
 * 
 * @param {Array} items - Array of items that can be selected
 * @param {Array} initialSelected - Initial array of selected item IDs
 * @returns {Object} Selection state and methods
 */
export function useItemSelection(items = [], initialSelected = []) {
  const [selectedItems, setSelectedItems] = useState(new Set(initialSelected));

  // Toggle selection for a single item
  const toggleItemSelection = useCallback((itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Select all items
  const selectAll = useCallback(() => {
    const allItemIds = items.map(item => item.id);
    setSelectedItems(new Set(allItemIds));
  }, [items]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Check if an item is selected
  const isSelected = useCallback((itemId) => {
    return selectedItems.has(itemId);
  }, [selectedItems]);

  // Check if all items are selected
  const isAllSelected = useMemo(() => {
    return items.length > 0 && selectedItems.size === items.length;
  }, [items.length, selectedItems.size]);

  // Check if some items are selected (for indeterminate state)
  const isSomeSelected = useMemo(() => {
    return selectedItems.size > 0 && selectedItems.size < items.length;
  }, [items.length, selectedItems.size]);

  // Get array of selected item IDs
  const selectedItemIds = useMemo(() => {
    return Array.from(selectedItems);
  }, [selectedItems]);

  // Get count of selected items
  const selectedCount = useMemo(() => {
    return selectedItems.size;
  }, [selectedItems.size]);

  // Check if any items are selected
  const hasSelection = useMemo(() => {
    return selectedItems.size > 0;
  }, [selectedItems.size]);

  // Get selected item objects
  const selectedItemObjects = useMemo(() => {
    return items.filter(item => selectedItems.has(item.id));
  }, [items, selectedItems]);

  // Handle select all checkbox (supports indeterminate state)
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      selectAll();
    } else {
      clearSelection();
    }
  }, [selectAll, clearSelection]);

  return {
    // State
    selectedItems: selectedItemIds,
    selectedItemObjects,
    selectedCount,
    hasSelection,
    isAllSelected,
    isSomeSelected,
    
    // Methods
    toggleItemSelection,
    selectAll,
    clearSelection,
    isSelected,
    handleSelectAll,
  };
}

export default useItemSelection;