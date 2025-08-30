"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Settings } from 'lucide-react'
import Link from 'next/link'
import CustomIdFormatManager from '@/components/CustomIdFormatManager'
import { updateInventoryCustomIdFormatAction } from '@/lib/inventory-actions'
import { toast } from 'sonner'

export default function CustomIdSettingsClient({ 
  inventory, 
  canEdit, 
  isAdmin 
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [customIdFormat, setCustomIdFormat] = useState(inventory.customIdFormat)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleFormatChange = (newFormat) => {
    setCustomIdFormat(newFormat)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!hasChanges) return
    
    setIsSaving(true)
    try {
      const result = await updateInventoryCustomIdFormatAction(
        inventory.id, 
        customIdFormat, 
        inventory.version
      )
      
      if (result.success) {
        toast.success('Custom ID format saved successfully')
        setHasChanges(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save custom ID format')
      }
    } catch (error) {
      console.error('Error saving custom ID format:', error)
      toast.error('Failed to save custom ID format')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/inventory/${inventory.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('actions.back')}
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <h1 className="text-3xl font-bold tracking-tight">Custom ID Settings</h1>
              {isAdmin && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  {t('inventory.adminView')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Configure custom ID format for <strong>{inventory.title}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {/* Custom ID Format Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Custom ID Format Configuration</CardTitle>
          <CardDescription>
            Design how custom IDs will be generated for items in this inventory. 
            Changes will apply to new items created after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomIdFormatManager
            initialFormat={inventory.customIdFormat}
            onFormatChange={handleFormatChange}
            inventoryId={inventory.id}
          />
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>How Custom IDs Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Automatic Generation</h4>
            <p className="text-sm text-muted-foreground">
              When you add new items to this inventory, custom IDs will be automatically generated 
              based on the format you configure above.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Existing Items</h4>
            <p className="text-sm text-muted-foreground">
              Existing items will keep their current custom IDs. Only new items will use the new format.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Uniqueness</h4>
            <p className="text-sm text-muted-foreground">
              All custom IDs within this inventory must be unique. The system will automatically 
              ensure this when generating new IDs.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}