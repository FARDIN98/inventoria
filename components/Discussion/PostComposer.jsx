'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  markdownComponents, 
  remarkPlugins, 
  getUserInitials, 
  validatePostContent 
} from '@/lib/utils/discussion-utils';

import { Textarea } from '@/components/ui/textarea';
import { Send, AlertCircle, Eye, Edit, Bold, Italic, List, Quote, Code, Link, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Post composer component with markdown editing
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
  const [showPreview, setShowPreview] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const MAX_CHARACTERS = 10000;
  const characterCount = content.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;
  const isNearLimit = characterCount > MAX_CHARACTERS * 0.8;



  // Handle content change
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    if (error) setError(''); // Clear error when user starts typing
  }, [error]);
  
  // Validate content
  const validateContent = useCallback((content) => {
    const validation = validatePostContent(content, MAX_CHARACTERS);
    if (!validation.isValid) {
      setError(validation.error);
      return false;
    }
    return true;
  }, []);



  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateContent(content)) {
      return;
    }
    
    if (isSubmitting) return;
    
    try {
      const result = await onSubmit(content.trim());
      
      if (result?.success) {
        setContent('');
        setError('');
        setIsEditorOpen(false);
      } else {
        setError(result?.error || t('discussion.submitError', 'Failed to post. Please try again.'));
      }
    } catch (err) {
      console.error('Error submitting post:', err);
      setError(t('discussion.submitError', 'Failed to post. Please try again.'));
    }
  }, [content, validateContent, isSubmitting, onSubmit, t]);

  // Markdown formatting functions
  const insertMarkdown = useCallback((before, after = '', placeholder = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newContent = 
      content.substring(0, start) + 
      before + textToInsert + after + 
      content.substring(end);
    
    setContent(newContent);
    
    // Set cursor position after insertion
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  const formatBold = useCallback(() => insertMarkdown('**', '**', ''), [insertMarkdown]);
  const formatItalic = useCallback(() => insertMarkdown('*', '*', ''), [insertMarkdown]);
  const formatCode = useCallback(() => insertMarkdown('`', '`', ''), [insertMarkdown]);
  const formatQuote = useCallback(() => insertMarkdown('> ', '', ''), [insertMarkdown]);
  const formatList = useCallback(() => insertMarkdown('- ', '', ''), [insertMarkdown]);
  const formatLink = useCallback(() => insertMarkdown('[', '](url)', 'link text'), [insertMarkdown]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
      return;
    }
    
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      formatBold();
      return;
    }
    
    // Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      formatItalic();
      return;
    }
  }, [handleSubmit, formatBold, formatItalic]);



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
        {!isEditorOpen ? (
          // Collapsed state - Show "Write Comment" button
          <div className="flex gap-3">
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
            <Button 
              variant="outline" 
              onClick={() => setIsEditorOpen(true)}
              className="flex-1 justify-start text-muted-foreground"
            >
              {t('discussion.writeComment', 'Write Comment')}
            </Button>
          </div>
        ) : (
          // Expanded state - Show full editor
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
              <div className="flex-1 min-w-0 space-y-3">
              {/* Markdown Toolbar */}
              <div className="flex items-center gap-1 p-2 border rounded-md bg-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatBold}
                  className="h-8 w-8 p-0"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatItalic}
                  className="h-8 w-8 p-0"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatCode}
                  className="h-8 w-8 p-0"
                  title="Code"
                >
                  <Code className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatQuote}
                  className="h-8 w-8 p-0"
                  title="Quote"
                >
                  <Quote className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatList}
                  className="h-8 w-8 p-0"
                  title="List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={formatLink}
                  className="h-8 w-8 p-0"
                  title="Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                
                <div className="flex-1" />
                
                {/* Close Button */}
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditorOpen(false);
                    setContent('');
                    setError('');
                  }}
                  className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white font-bold"
                  title="Close Editor"
                >
                  <X className="h-4 w-4" />
                </Button>

              </div>

              {/* Text Area with Integrated Preview */}
              <div 
                className={cn(
                  "border rounded-md transition-colors overflow-hidden",
                  error && "border-destructive",
                  "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring"
                )}
              >
                <div className="flex flex-col">
                  {/* Text Area */}
                  <Textarea
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || t('discussion.placeholder', 'Share your thoughts...')}
                    className="min-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-b"
                  />
                  
                  {/* Integrated Preview */}
                  {content.trim() && (
                    <div className="bg-muted/30 border-t">
                      <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/50">
                        {t('discussion.preview', 'Preview')}
                      </div>
                      <div className="p-3 min-h-[60px] max-h-[200px] overflow-y-auto">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown 
                            remarkPlugins={remarkPlugins}
                            components={markdownComponents}
                          >
                            {content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
        )}
      </CardContent>
    </Card>
  );
}

// Export for use in other components
export { PostComposer };