import { getInventoryByIdAction, toggleInventoryVisibilityAction } from '@/lib/inventory-actions';
import { getInventoryItemsAction } from '@/lib/item-actions';
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

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{inventory.title}</h1>
              {isAdmin && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  Admin View
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Created by {inventory.users?.name || inventory.users?.email || 'Unknown'} on {new Date(inventory.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VisibilityToggle 
            inventoryId={inventory.id}
            isPublic={inventory.isPublic}
            canToggle={canToggleVisibility}
          />
          {canEdit && (
            <Link href={`/inventory/edit?id=${inventory.id}`}>
              <Button className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Inventory
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Inventory Details */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Details</CardTitle>
          <CardDescription>
            Basic information about this inventory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-2">Description</h3>
            <p className="text-sm">
              {inventory.description || 'No description provided'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Category</h3>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                {inventory.categories?.name || 'Uncategorized'}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {inventory.inventory_tags && inventory.inventory_tags.length > 0 ? (
                  inventory.inventory_tags.map((tagRelation, index) => (
                    <Badge 
                      key={index} 
                      variant="outline"
                      className="text-xs"
                    >
                      {tagRelation.tags?.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No tags</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Visibility</h3>
              <Badge variant={inventory.isPublic ? 'default' : 'secondary'}>
                {inventory.isPublic ? 'Public' : 'Private'}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Created</h3>
              <p className="text-sm">{new Date(inventory.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Last Updated</h3>
              <p className="text-sm">{new Date(inventory.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
        <Card>
          <CardContent className="pt-6">
            <ItemsTableWrapper 
              initialItems={items}
              inventoryId={id}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
    </div>
  );
}