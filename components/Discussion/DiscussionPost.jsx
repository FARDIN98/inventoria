'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Individual discussion post component
 * Displays author info, timestamp, markdown content, and delete functionality
 */
export default function DiscussionPost({ 
  post, 
  currentUser = null, 
  onDelete, 
  isOptimistic = false,
  className = '' 
}) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Check if current user can delete this post
  const canDelete = currentUser && (
    currentUser.id === post.authorId || 
    currentUser.role === 'ADMIN' ||
    post.isOptimistic // Can always delete optimistic posts
  );

  // Handle post deletion
  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const result = await onDelete(post.id);
      if (!result.success) {
        console.error('Failed to delete post:', result.error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get author initials for avatar fallback
  const getAuthorInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Custom markdown components for security and styling
  const markdownComponents = {
    // Prevent external links from opening in same tab
    a: ({ href, children, ...props }) => {
      const isExternal = href && (href.startsWith('http') || href.startsWith('https'));
      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-primary hover:underline"
          {...props}
        >
          {children}
        </a>
      );
    },
    // Style code blocks
    code: ({ inline, children, ...props }) => {
      if (inline) {
        return (
          <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-muted p-3 rounded-md overflow-x-auto">
          <code className="text-sm font-mono" {...props}>
            {children}
          </code>
        </pre>
      );
    },
    // Style blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground" {...props}>
        {children}
      </blockquote>
    ),
    // Style lists
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside space-y-1" {...props}>
        {children}
      </ol>
    ),
    // Style headings
    h1: ({ children, ...props }) => (
      <h1 className="text-xl font-bold mt-4 mb-2" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-lg font-semibold mt-3 mb-2" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-base font-medium mt-2 mb-1" {...props}>
        {children}
      </h3>
    ),
  };

  return (
    <article 
      className={cn(
        "flex gap-3 p-4 rounded-lg transition-all duration-200",
        isOptimistic && "opacity-70 bg-muted/30",
        "hover:bg-muted/20",
        className
      )}
      role="article"
      aria-label={`Post by ${post.author?.name || 'Unknown user'}`}
    >
      {/* Author Avatar */}
      <div className="flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={post.author?.image} 
            alt={post.author?.name || 'User avatar'}
          />
          <AvatarFallback className="text-xs">
            {getAuthorInitials(post.author?.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Post Content */}
      <div className="flex-1 min-w-0">
        {/* Post Header */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Author Name */}
          <Link 
            href="/dashboard" 
            className="font-medium text-sm hover:underline focus:underline focus:outline-none"
            tabIndex={0}
          >
            {post.author?.name || t('discussion.unknownUser', 'Unknown User')}
          </Link>
          
          
          
          {/* Optimistic indicator */}
          {isOptimistic && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t('discussion.posting', 'Posting...')}</span>
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="prose prose-sm max-w-none text-sm leading-relaxed break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Actions */}
      {canDelete && !isOptimistic && (
        <div className="flex-shrink-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                disabled={isDeleting}
                aria-label={t('discussion.deletePost', 'Delete post')}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('discussion.deleteConfirmTitle', 'Delete post?')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('discussion.deleteConfirmDescription', 
                    'This action cannot be undone. The post will be permanently removed from the discussion.'
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t('actions.cancel', 'Cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('actions.delete', 'Delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </article>
  );
}

// Export for use in other components
export { DiscussionPost };