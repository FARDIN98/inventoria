'use client';

import { useState, useEffect } from 'react';
import ItemsTable from './ItemsTable';
import { getInventoryItemsAction } from '@/lib/item-actions';

export default function ItemsTableWrapper({ 
  initialItems = [], 
  inventoryId, 
  inventory,
  canEdit = false 
}) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);

  const refreshItems = async () => {
    setLoading(true);
    try {
      const result = await getInventoryItemsAction(inventoryId);
      if (result.success) {
        setItems(result.items);
      }
    } catch (error) {
      console.error('Error refreshing items:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ItemsTable 
      items={items}
      inventoryId={inventoryId}
      inventory={inventory}
      canEdit={canEdit}
      onItemsChange={refreshItems}
    />
  );
}