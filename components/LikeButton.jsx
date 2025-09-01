'use client';

import { useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import useLikesStore, { likeUtils } from '@/lib/stores/likes';
import { cn } from '@/lib/utils';

/**
 * LikeButton component for toolbar - activates when items are selected via checkboxes
 * Handles batch like operations for multiple selected items
 * 
 * @param {Array} selectedItemIds - Array of selected item IDs
 * @param {Object} currentUser - Current authenticated user object
 * @param {Function} onLikeComplete - Callback after successful like operation
 * @param {boolean} disabled - Whether the button is disabled
 * @param {string} className - Additional CSS classes
 */
export default function LikeButton({
  selectedItemIds = [],
  currentUser = null,
  onLikeComplete,
  disabled = false,
  className
}) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  
  // Use Zustand store for centralized like state management
  const {
    batchToggleLikes,
    getSelectedItemsStats,
    batchOperationInProgress
  } = useLikesStore();

  const hasSelection = selectedItemIds.length > 0;
  const isAuthenticated = !!currentUser;
  const isDisabled = disabled || !hasSelection || !isAuthenticated || isPending || batchOperationInProgress;
  
  // Get aggregated stats for selected items
  const stats = getSelectedItemsStats(selectedItemIds);

  // Handle batch like operation using Zustand store
  const handleLikeSelected = async () => {
    if (!isAuthenticated || !hasSelection) return;

    startTransition(async () => {
      try {
        const result = await batchToggleLikes(selectedItemIds);
        
        // Call completion callback
        if (onLikeComplete) {
          onLikeComplete({
            success: result.success,
            results: result.results || [],
            selectedCount: selectedItemIds.length,
            processedCount: result.processedCount || 0
          });
        }
      } catch (error) {
        console.error('Error in batch like operation:', error);
        
        // Call completion callback with error
        if (onLikeComplete) {
          onLikeComplete({
            success: false,
            error: 'Batch like operation failed',
            selectedCount: selectedItemIds.length
          });
        }
      }
    });
  };

  // Use utility functions for consistent text generation
  const buttonText = likeUtils.getButtonText(selectedItemIds.length, stats, isAuthenticated, t);
  const tooltipText = likeUtils.getTooltipText(selectedItemIds.length, stats, isAuthenticated, t);

  return (
    <Button
      variant={stats.hasLikedItems ? "default" : "outline"}
      size="sm"
      onClick={handleLikeSelected}
      disabled={isDisabled}
      className={cn(
        "transition-all duration-200",
        stats.hasLikedItems && "bg-red-500 hover:bg-red-600 text-white",
        !isAuthenticated && "opacity-50 cursor-not-allowed",
        className
      )}
      title={tooltipText}
    >
      {isPending || batchOperationInProgress ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Heart 
          className={cn(
            "h-4 w-4 mr-2 transition-all duration-200",
            stats.hasLikedItems ? "fill-current" : "stroke-current fill-none"
          )}
        />
      )}
      {buttonText}
      {stats.totalLikes > 0 && (
        <span className="ml-2 px-2 py-1 bg-black/20 rounded-full text-xs font-medium">
          {likeUtils.formatLikeCount(stats.totalLikes)}
        </span>
      )}
    </Button>
  );
}