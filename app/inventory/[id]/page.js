import { getInventoryByIdAction, toggleInventoryVisibilityAction } from '@/lib/inventory-actions';
import { getInventoryItemsAction } from '@/lib/item-actions';
import { getInventoryFieldTemplatesAction } from '@/lib/field-actions';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Eye, EyeOff, Tag, User, ArrowLeft, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ItemsTableWrapper from '@/components/ItemsTableWrapper';
import VisibilityToggle from '@/components/VisibilityToggle';
import { getCurrentUserServer } from '@/lib/auth-actions';
import InventoryDetailClient from '@/components/InventoryDetailClient';

export default async function InventoryDetailPage({ params }) {
  const { id } = await params;
  
  // Get current user session
  const { user } = await getCurrentUserServer();
  
  const result = await getInventoryByIdAction(id);
  
  if (!result.success) {
    notFound();
  }
  
  const inventory = result.inventory;
  
  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const supabase = await createClient();
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    isAdmin = userRecord?.role === 'ADMIN';
  }
  
  // Check if current user can edit this inventory (owner, admin, or authenticated user with public inventory)
  const canEdit = user && (inventory.ownerId === user.id || isAdmin || inventory.isPublic);
  const canToggleVisibility = user && (inventory.ownerId === user.id || isAdmin);
  
  // Get items for this inventory
  const itemsResult = await getInventoryItemsAction(id);
  const items = itemsResult.success ? itemsResult.items : [];

  // Get field templates for this inventory
  const fieldTemplatesResult = await getInventoryFieldTemplatesAction(id);
  const fieldTemplates = fieldTemplatesResult.success ? fieldTemplatesResult.fieldTemplates : [];

  return (
    <InventoryDetailClient 
      inventory={inventory}
      items={items}
      fieldTemplates={fieldTemplates}
      canEdit={canEdit}
      canToggleVisibility={canToggleVisibility}
      isAdmin={isAdmin}
      currentUserId={user?.id}
    />
  );
}