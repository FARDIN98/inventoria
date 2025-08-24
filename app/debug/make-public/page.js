'use client'

import { useState } from 'react'
import { makeInventoriesPublicAction } from '@/lib/inventory-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MakePublicPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleMakePublic = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await makeInventoriesPublicAction()
      setResult(response)
    } catch (error) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Make Inventories Public</CardTitle>
          <CardDescription>
            This is a one-time fix to make your existing inventories visible on the home page.
            New inventories will be public by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleMakePublic} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Updating...' : 'Make My Inventories Public'}
          </Button>
          
          {result && (
            <div className={`p-3 rounded-md ${
              result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {result.success ? (
                <div>
                  <p className="font-medium">Success!</p>
                  <p>Updated {result.updatedCount} inventories to public.</p>
                  {result.inventories && result.inventories.length > 0 && (
                    <ul className="mt-2 text-sm">
                      {result.inventories.map(inv => (
                        <li key={inv.id}>• {inv.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-medium">Error</p>
                  <p>{result.error}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            <p>After updating, go back to the home page to see your inventories displayed.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}