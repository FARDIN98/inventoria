"use client"

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Settings, BarChart3, Database, Wrench, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import ItemsTableWrapper from '@/components/ItemsTableWrapper'
import VisibilityToggle from '@/components/VisibilityToggle'
import CustomFieldsManager from '@/components/CustomFieldsManager'
import InventoryStats from '@/components/InventoryStats'
import DiscussionPanel from '@/components/Discussion/DiscussionPanel'

export default function InventoryDetailClient({ 
  inventory, 
  items, 
  fieldTemplates = [],
  canEdit, 
  canToggleVisibility, 
  isAdmin,
  currentUserId,
  initialDiscussionPosts = []
}) {
  const [currentFieldTemplates, setCurrentFieldTemplates] = useState(fieldTemplates);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('items')
  
  // Check if user can manage field settings (owner or admin)
  const canManageFields = canEdit && (inventory.ownerId === currentUserId || isAdmin)
  
  // Discussion permissions
  const canViewDiscussion = true; // All users can view discussions
  const canPostDiscussion = currentUserId && (canEdit || inventory.isPublic); // Authenticated users with write access OR public inventory
  
  // Current user object for DiscussionPanel
  const currentUser = currentUserId ? { id: currentUserId } : null;
  
  // Update field templates when prop changes
  useEffect(() => {
    setCurrentFieldTemplates(fieldTemplates);
  }, [fieldTemplates]);
  
  // Deep linking support - set active tab based on URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove # from hash
    if (hash === 'discussion') {
      setActiveTab('discussion');
    } else if (hash === 'fields' && canManageFields) {
      setActiveTab('fields');
    } else if (hash === 'stats') {
      setActiveTab('stats');
    }
  }, [canManageFields]);
  
  // Update URL hash when tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
    // Update URL hash for deep linking
    if (value !== 'items') {
      window.history.replaceState(null, '', `#${value}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/50">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-white/80 to-blue-50/80 dark:from-slate-900/80 dark:to-blue-950/80 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-500 hover:text-white transition-all duration-200">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('actions.back')}
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">{inventory.title}</h1>
                {isAdmin && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md animate-pulse">
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
                  <Button variant="outline" className="flex items-center gap-2 bg-white/80 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white hover:border-transparent transition-all duration-200">
                    <Settings className="h-4 w-4" />
                    Create Custom ID 
                  </Button>
                </Link>
                <Link href={`/inventory/edit?id=${inventory.id}`}>
                  <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                    <Edit className="h-4 w-4" />
                    {t('inventory.editInventory')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Inventory Details */}
        <Card className="bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-900/90 dark:to-slate-950/80 border-slate-200/50 dark:border-slate-700/50 shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50/50 to-blue-50/50 dark:from-slate-950/30 dark:to-blue-950/30">
            <CardTitle className="bg-gradient-to-r from-slate-700 to-blue-700 dark:from-slate-300 dark:to-blue-300 bg-clip-text text-transparent">{t('inventory.inventoryDetails')}</CardTitle>
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
              <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200">
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
                      className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
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
              <Badge className={inventory.isPublic 
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md" 
                : "bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-md"
              }>
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
              <h3 className="font-medium text-sm text-muted-foreground mb-1">{t('actions.customId')}</h3>
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
                <p className="text-sm text-muted-foreground">{t('actions.customFormat')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className={`grid w-full ${canManageFields ? 'grid-cols-4' : 'grid-cols-3'} bg-gradient-to-r from-slate-100 to-blue-100 dark:from-slate-800 dark:to-blue-900 p-1 rounded-xl shadow-lg`}>
            <TabsTrigger value="items" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
              <Database className="h-4 w-4" />
              {t('inventory.tabs.items', 'Items')}
            </TabsTrigger>
            <TabsTrigger value="discussion" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
              <MessageCircle className="h-4 w-4" />
              {t('inventory.tabs.discussion', 'Discussion')}
            </TabsTrigger>
            {canManageFields && (
              <TabsTrigger value="fields" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
                <Wrench className="h-4 w-4" />
                {t('inventory.tabs.fieldSettings', 'Field Settings')}
              </TabsTrigger>
            )}
            <TabsTrigger value="stats" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
              <BarChart3 className="h-4 w-4" />
              {t('inventory.tabs.statistics', 'Statistics')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-blue-50/80 dark:from-slate-900/90 dark:to-blue-950/80 border-blue-200/50 dark:border-blue-800/30 shadow-xl backdrop-blur-sm">
              <CardContent className="pt-6">
                <ItemsTableWrapper 
                  initialItems={items}
                  inventoryId={inventory.id}
                  inventory={inventory}
                  fieldTemplates={currentFieldTemplates}
                  canEdit={canEdit}
                  currentUser={currentUser}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discussion" className="space-y-6">
            <Card className="h-[600px] bg-gradient-to-br from-white/90 to-emerald-50/80 dark:from-slate-900/90 dark:to-emerald-950/80 border-emerald-200/50 dark:border-emerald-800/30 shadow-xl backdrop-blur-sm">
              <CardContent className="p-0 h-full">
                <DiscussionPanel
                  inventoryId={inventory.id}
                  currentUser={currentUser}
                  canPost={canPostDiscussion}
                  initialPosts={initialDiscussionPosts}
                  className="h-full"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {canManageFields && (
            <TabsContent value="fields" className="space-y-6">
              <Card className="bg-gradient-to-br from-white/90 to-purple-50/80 dark:from-slate-900/90 dark:to-purple-950/80 border-purple-200/50 dark:border-purple-800/30 shadow-xl backdrop-blur-sm">
                {/* <CardHeader>
                  <CardTitle>{t('inventory.fieldSettings.title')}</CardTitle>
                  <CardDescription>
                    {t('inventory.fieldSettings.description')}
                  </CardDescription>
                </CardHeader> */}
                <CardContent>
                  <CustomFieldsManager
                     initialFields={currentFieldTemplates}
                     inventoryId={inventory.id}
                     onFieldsChange={async (fields, isValid, isSaved) => {
                       if (isSaved) {
                         // Refresh the page to get updated field templates
                         window.location.reload();
                       }
                     }}
                   />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="stats" className="space-y-6">
            <div className="bg-gradient-to-br from-white/90 to-orange-50/80 dark:from-slate-900/90 dark:to-orange-950/80 border-orange-200/50 dark:border-orange-800/30 shadow-xl backdrop-blur-sm rounded-lg">
              <InventoryStats
                inventory={inventory}
                items={items}
                fieldTemplates={currentFieldTemplates}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}