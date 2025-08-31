'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, MessageCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeDiscussion } from '@/lib/hooks/useRealtimeDiscussion';
import DiscussionPost from './DiscussionPost';
import PostComposer from './PostComposer';

/**
 * Main discussion panel component that manages real-time discussion posts
 * Uses useRealtimeDiscussion hook for real-time updates and state management
 */
export default function DiscussionPanel({ 
  inventoryId, 
  currentUser = null, 
  canPost = false,
  initialPosts = null,
  className = '' 
}) {
  const { t } = useTranslation();
  
  const {
    posts,
    isLoading,
    isConnected,
    isError,
    isReconnecting,
    isSubmitting,
    error,
    addPost,
    deletePost,
    retryConnection,
    scrollContainerRef
  } = useRealtimeDiscussion(inventoryId, {
    autoScroll: true,
    scrollThreshold: 100,
    initialPosts
  });

  // Handle post submission from composer
  const handlePostSubmit = async (content) => {
    const result = await addPost(content);
    return result;
  };

  // Handle post deletion
  const handlePostDelete = async (postId) => {
    const result = await deletePost(postId);
    return result;
  };

  // Connection status indicator
  const ConnectionStatus = () => {
    if (isError) {
      return (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <WifiOff className="h-4 w-4" />
          <span>Connection failed</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={retryConnection}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }
    
    if (isReconnecting) {
      return (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Reconnecting...</span>
        </div>
      );
    }
    
    if (isConnected) {
      return (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Wifi className="h-4 w-4" />
          <span>Connected</span>
        </div>
      );
    }
    
    return null;
  };

  // Loading skeleton for initial posts fetch
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state when no posts exist
  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">
        {t('discussion.emptyTitle', 'Start the conversation')}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {t('discussion.emptyDescription', 'Be the first to share your thoughts about this inventory.')}
      </p>
      {!canPost && (
        <p className="text-sm text-muted-foreground">
          {t('discussion.signInPrompt', 'Sign in to join the discussion')}
        </p>
      )}
    </div>
  );

  // Error state display
  const ErrorState = () => (
    <div className="text-center py-8">
      <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-medium mb-2 text-destructive">
        {t('discussion.errorTitle', 'Failed to load discussion')}
      </h3>
      <p className="text-muted-foreground mb-4">
        {error || t('discussion.errorDescription', 'Something went wrong while loading the discussion.')}
      </p>
      <Button onClick={retryConnection} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        {t('actions.retry', 'Try again')}
      </Button>
    </div>
  );

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t('discussion.title', 'Discussion')}
            {posts.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({posts.length})</span>
            )}
          </CardTitle>
          <ConnectionStatus />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        {/* Posts container with scroll */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 pb-4"
          role="log"
          aria-live="polite"
          aria-label={t('discussion.postsLabel', 'Discussion posts')}
        >
          {isLoading && <LoadingSkeleton />}
          
          {isError && !isLoading && <ErrorState />}
          
          {!isLoading && !isError && posts.length === 0 && <EmptyState />}
          
          {!isLoading && !isError && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((post) => (
                <DiscussionPost
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onDelete={handlePostDelete}
                  isOptimistic={post.isOptimistic}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Post composer at bottom */}
        {canPost && (
          <div className="border-t bg-background px-6 py-4">
            <PostComposer
              onSubmit={handlePostSubmit}
              isSubmitting={isSubmitting}
              currentUser={currentUser}
            />
          </div>
        )}
        
        {/* Sign in prompt for unauthenticated users */}
        {!canPost && !currentUser && (
          <div className="border-t bg-muted/30 px-6 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('discussion.signInToPost', 'Sign in to join the discussion')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export for use in other components
export { DiscussionPanel };