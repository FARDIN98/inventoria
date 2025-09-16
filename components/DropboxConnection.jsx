'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { checkDropboxConnection, disconnectDropbox } from '@/lib/support-actions'

export default function DropboxConnection() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  
  useEffect(() => {
    checkConnection()
  }, [])
  
  const checkConnection = async () => {
    try {
      const result = await checkDropboxConnection()
      if (result.success) {
        setConnected(result.connected)
      }
    } catch (error) {
      console.error('Failed to check connection:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleConnect = () => {
    window.location.href = '/api/dropbox/auth'
  }
  
  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const result = await disconnectDropbox()
      if (result.success) {
        setConnected(false)
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    } finally {
      setDisconnecting(false)
    }
  }
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Dropbox Integration
          {connected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your Dropbox account to enable automatic support ticket uploads
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="space-y-4">
            <p className="text-sm text-green-600">
              ✅ Your Dropbox account is connected and ready to receive support tickets.
            </p>
            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect Dropbox'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Dropbox account to automatically upload support tickets as JSON files.
            </p>
            <Button onClick={handleConnect}>
              Connect Dropbox
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}