"use client"

import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Settings } from 'lucide-react'
import Link from 'next/link'
import ItemsTableWrapper from '@/components/ItemsTableWrapper'
import VisibilityToggle from '@/components/VisibilityToggle'

export default function InventoryDetailClient({ 
  inventory, 
  items, 
  canEdit, 
  canToggleVisibility, 
  isAdmin 
}) {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('actions.back')}
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{inventory.title}</h1>
              {isAdmin && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  {t('inventory.adminView')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {t('inventory.createdBy')} {inventory.users?.name || inventory.users?.email || t('common.unknown')} {t('inventory.on')} {new Date(inventory.createdAt).toLocaleDateString()}
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
            <>
              <Link href={`/inventory/${inventory.id}/settings/custom-id`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Create Custom ID 
                </Button>
              </Link>
              <Link href={`/inventory/edit?id=${inventory.id}`}>
                <Button className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  {t('inventory.editInventory')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Inventory Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.inventoryDetails')}</CardTitle>
          <CardDescription>
            {t('inventory.basicInformation')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-2">{t('forms.description')}</h3>
            <p className="text-sm">
              {inventory.description || t('inventory.noDescription')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">{t('forms.category')}</h3>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                {inventory.categories?.name || t('common.uncategorized')}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-2">{t('forms.tags')}</h3>
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
                  <span className="text-muted-foreground text-sm">{t('common.noTags')}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">{t('common.visibility')}</h3>
              <Badge variant={inventory.isPublic ? 'default' : 'secondary'}>
                {inventory.isPublic ? t('common.public') : t('common.private')}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">{t('common.created')}</h3>
              <p className="text-sm">{new Date(inventory.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">{t('inventory.lastUpdated')}</h3>
              <p className="text-sm">{new Date(inventory.updatedAt).toLocaleDateString()}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Custom ID</h3>
              {inventory.customIdFormat ? (
                <div className="bg-muted p-2 rounded text-xs font-mono">
                  {(() => {
                    try {
                      const format = JSON.parse(inventory.customIdFormat);
                      const elements = format.elements || [];
                      
                      if (elements.length === 0) return 'Invalid format';
                      
                      // Generate sample ID using exact same logic as CustomIdFormatManager preview
                      const previewParts = elements.map(element => {
                        switch (element.type) {
                          case 'FIXED_TEXT':
                            return element.value || '';
                          case 'DATETIME':
                            return '20240115';
                          case 'SEQUENCE':
                            return '001';
                          case 'GUID':
                            return '12345678-1234-4123-8123-123456789012';
                          case 'RANDOM_6DIGIT':
                            return '123456';
                          case 'RANDOM_9DIGIT':
                            return '123456789';
                          case 'RANDOM_20BIT':
                            return '524288';
                          case 'RANDOM_32BIT':
                            return '2147483648';
                          default:
                            return '';
                        }
                      });
                      
                      return previewParts.join('');
                    } catch (error) {
                      return 'Invalid JSON format';
                    }
                  })()}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No custom format configured</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardContent className="pt-6">
          <ItemsTableWrapper 
            initialItems={items}
            inventoryId={inventory.id}
            inventory={inventory}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  )
}