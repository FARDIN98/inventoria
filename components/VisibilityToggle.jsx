'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { toggleInventoryVisibilityAction } from '@/lib/inventory-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function VisibilityToggle({ inventoryId, isPublic, canToggle }) {
  const [isToggling, setIsToggling] = useState(false)
  const [currentVisibility, setCurrentVisibility] = useState(isPublic)
  const router = useRouter()

  const handleToggle = async () => {
    if (!canToggle) return
    
    setIsToggling(true)
    
    try {
      const result = await toggleInventoryVisibilityAction(inventoryId)
      if (result.success) {
        setCurrentVisibility(result.inventory.isPublic)
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to toggle visibility')
    } finally {
      setIsToggling(false)
    }
  }

  if (!canToggle) {
    return (
      <div className="flex items-center gap-2">
        {currentVisibility ? (
          <><Eye className="h-4 w-4" />Public</>
        ) : (
          <><EyeOff className="h-4 w-4" />Private</>
        )}
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isToggling}
      className="flex items-center gap-2"
    >
      {isToggling ? (
        'Updating...'
      ) : currentVisibility ? (
        <><EyeOff className="h-4 w-4" />Make Private</>
      ) : (
        <><Eye className="h-4 w-4" />Make Public</>
      )}
    </Button>
  )
}