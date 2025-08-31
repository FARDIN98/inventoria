'use client';

import React, { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamic import of MDXEditor with SSR disabled for Next.js compatibility
const MDXEditor = dynamic(
  () => import('@mdxeditor/editor').then((mod) => ({ default: mod.MDXEditor })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] border rounded-md flex items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading editor...</span>
        </div>
      </div>
    )
  }
);

// Dynamic import of MDXEditor plugins - import them as individual functions
let mdxEditorPlugins = null;
let mdxEditorComponents = null;

// Load plugins dynamically
if (typeof window !== 'undefined') {
  import('@mdxeditor/editor').then((mod) => {
    mdxEditorPlugins = {
      headingsPlugin: mod.headingsPlugin,
      listsPlugin: mod.listsPlugin,
      quotePlugin: mod.quotePlugin,
      markdownShortcutPlugin: mod.markdownShortcutPlugin,
      toolbarPlugin: mod.toolbarPlugin
    };
    mdxEditorComponents = {
      UndoRedo: mod.UndoRedo,
      BoldItalicUnderlineToggles: mod.BoldItalicUnderlineToggles,
      BlockTypeSelect: mod.BlockTypeSelect,
      ListsToggle: mod.ListsToggle,
      Separator: mod.Separator,
      InsertThematicBreak: mod.InsertThematicBreak
    };
  });
}

/**
 * Post composer component with MDXEditor integration
 * Provides rich markdown editing experience with toolbar and validation
 */
export default function PostComposer({ 
  onSubmit, 
  isSubmitting = false, 
  currentUser = null,
  placeholder = '',
  className = '' 
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isEditorReady, setIsEditorReady] = useState(true);
  const [pluginsLoaded, setPluginsLoaded] = useState(false);
  
  // Check if plugins are loaded
  React.useEffect(() => {
    const checkPlugins = () => {
      if (mdxEditorPlugins && mdxEditorComponents) {
        setPluginsLoaded(true);
      } else {
        setTimeout(checkPlugins, 100);
      }
    };
    checkPlugins();
  }, []);
  
  const MAX_CHARACTERS = 10000;
  const characterCount = content.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;
  const isNearLimit = characterCount > MAX_CHARACTERS * 0.8;

  // Get user initials for avatar fallback
  const getUserInitials = useCallback((name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  // Handle content change
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    if (error) setError(''); // Clear error when user starts typing
  }, [error]);

  // Validate content before submission
  const validateContent = useCallback((content) => {
    const trimmedContent = content.trim();
    
    if (!trimmedContent) {
      return t('discussion.validation.emptyContent', 'Please enter some content before posting.');
    }
    
    if (trimmedContent.length > MAX_CHARACTERS) {
      return t('discussion.validation.tooLong', 
        `Post is too long. Maximum ${MAX_CHARACTERS.toLocaleString()} characters allowed.`
      );
    }
    
    return null;
  }, [t]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    const validationError = validateContent(content);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      const result = await onSubmit(content.trim());
      
      if (result.success) {
        // Clear content on successful submission
        setContent('');
        setError('');
      } else {
        setError(result.error || t('discussion.submitError', 'Failed to post. Please try again.'));
      }
    } catch (err) {
      console.error('Error submitting post:', err);
      setError(t('discussion.submitError', 'Failed to post. Please try again.'));
    }
  }, [content, isSubmitting, onSubmit, validateContent, t]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // MDXEditor plugins configuration
  const editorPlugins = useMemo(() => {
    if (!pluginsLoaded || !mdxEditorPlugins || !mdxEditorComponents) return [];
    
    const { UndoRedo, BoldItalicUnderlineToggles, BlockTypeSelect, ListsToggle, Separator, InsertThematicBreak } = mdxEditorComponents;
    
    return [
      mdxEditorPlugins.headingsPlugin(),
      mdxEditorPlugins.listsPlugin(),
      mdxEditorPlugins.quotePlugin(),
      mdxEditorPlugins.markdownShortcutPlugin(),
      mdxEditorPlugins.toolbarPlugin({
        toolbarContents: () => (
          <div className="flex items-center gap-1">
            <UndoRedo />
            <Separator />
            <BoldItalicUnderlineToggles />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <ListsToggle />
            <Separator />
            <InsertThematicBreak />
          </div>
        )
      })
    ];
  }, [pluginsLoaded]);

  // Don't render if user is not authenticated
  if (!currentUser) {
    return (
      <Card className={cn("bg-muted/30", className)}>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t('discussion.signInToPost', 'Sign in to join the discussion')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Avatar and Editor Container */}
          <div className="flex gap-3">
            {/* Current User Avatar */}
            <div className="flex-shrink-0 pt-1">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={currentUser.image} 
                  alt={currentUser.name || 'Your avatar'}
                />
                <AvatarFallback className="text-xs">
                  {getUserInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Editor Container */}
            <div className="flex-1 min-w-0">
              <div 
                className={cn(
                  "border rounded-md transition-colors",
                  error && "border-destructive",
                  "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring"
                )}
                onKeyDown={handleKeyDown}
              >
                {isEditorReady && pluginsLoaded ? (
                  <MDXEditor
                    markdown={content}
                    onChange={handleContentChange}
                    plugins={editorPlugins}
                    placeholder={placeholder || t('discussion.placeholder', 'Share your thoughts...')}
                    className="min-h-[120px] [&_.mdxeditor-toolbar]:flex [&_.mdxeditor-toolbar]:flex-row [&_.mdxeditor-toolbar]:items-center [&_.mdxeditor-toolbar]:gap-1 [&_.mdxeditor-toolbar]:p-2 [&_.mdxeditor-toolbar]:border-b [&_.mdxeditor-toolbar]:flex-nowrap [&_.mdxeditor-toolbar]:overflow-x-auto"
                    contentEditableClassName="prose prose-sm max-w-none p-3 focus:outline-none"
                    onBlur={() => setIsEditorReady(true)}
                  />
                ) : (
                  <div 
                    className="min-h-[120px] p-3 text-sm text-muted-foreground cursor-text flex items-center justify-center"
                    onClick={() => setIsEditorReady(true)}
                  >
                    {!pluginsLoaded ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading editor...</span>
                      </div>
                    ) : (
                      placeholder || t('discussion.placeholder', 'Share your thoughts...')
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Character Count and Actions */}
          <div className="flex items-center justify-between gap-4">
            {/* Character Count */}
            <div className="flex items-center gap-2 text-xs">
              <span className={cn(
                "transition-colors",
                isOverLimit && "text-destructive",
                isNearLimit && !isOverLimit && "text-amber-600",
                !isNearLimit && "text-muted-foreground"
              )}>
                {characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}
              </span>
              {isOverLimit && (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={isSubmitting || isOverLimit || !content.trim()}
              size="sm"
              className="min-w-[80px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('discussion.posting', 'Posting...')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('discussion.post', 'Post')}
                </>
              )}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Keyboard Shortcut Hint */}
          <div className="text-xs text-muted-foreground">
            {t('discussion.shortcutHint', 'Press Ctrl+Enter to post')}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Export for use in other components
export { PostComposer };