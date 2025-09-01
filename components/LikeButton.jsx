'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { toggleItemLikeAction, getMultipleItemsLikeStatusAction } from '@/lib/like-actions';
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
  const [likeStates, setLikeStates] = useState({});
  
  // Optimistic updates for like states
  const [optimisticLikeStates, addOptimisticLike] = useOptimistic(
    likeStates,
    (state, { itemId, action, likeCount }) => ({
      ...state,
      [itemId]: {
        isLiked: action === 'liked',
        likeCount: likeCount,
        isOptimistic: true
      }
    })
  );

  const hasSelection = selectedItemIds.length > 0;
  const isAuthenticated = !!currentUser;
  const isDisabled = disabled || !hasSelection || !isAuthenticated || isPending;

  // Handle batch like operation
  const handleLikeSelected = async () => {
    if (!isAuthenticated || !hasSelection) return;

    startTransition(async () => {
      try {
        // Get current like states for selected items
        const { success: statusSuccess, items: currentStates } = await getMultipleItemsLikeStatusAction(selectedItemIds);
        
        if (!statusSuccess) {
          console.error('Failed to get current like states');
          return;
        }

        // Process each selected item
        const results = [];
        for (const itemId of selectedItemIds) {
          const currentState = currentStates[itemId] || { isLiked: false, likeCount: 0 };
          
          // Add optimistic update
          const newAction = currentState.isLiked ? 'unliked' : 'liked';
          const newLikeCount = currentState.isLiked 
            ? Math.max(0, currentState.likeCount - 1)
            : currentState.likeCount + 1;
            
          addOptimisticLike({ 
            itemId, 
            action: newAction, 
            likeCount: newLikeCount 
          });

          // Execute server action
          const result = await toggleItemLikeAction(itemId);
          results.push({ itemId, result });
        }

        // Update actual states based on server responses
        const newStates = {};
        let hasErrors = false;
        
        results.forEach(({ itemId, result }) => {
          if (result.success) {
            newStates[itemId] = {
              isLiked: result.isLiked,
              likeCount: result.likeCount,
              isOptimistic: false
            };
          } else {
            console.error(`Failed to toggle like for item ${itemId}:`, result.error);
            hasErrors = true;
          }
        });

        setLikeStates(prev => ({ ...prev, ...newStates }));

        // Call completion callback
        if (onLikeComplete) {
          onLikeComplete({
            success: !hasErrors,
            results,
            selectedCount: selectedItemIds.length
          });
        }

      } catch (error) {
        console.error('Error in batch like operation:', error);
        
        // Revert optimistic updates on error
        setLikeStates(prev => {
          const newState = { ...prev };
          selectedItemIds.forEach(itemId => {
            delete newState[itemId];
          });
          return newState;
        });
      }
    });
  };

  // Calculate display states
  const selectedLikeStates = selectedItemIds.map(itemId => 
    optimisticLikeStates[itemId] || likeStates[itemId] || { isLiked: false, likeCount: 0 }
  );
  
  const totalLikes = selectedLikeStates.reduce((sum, state) => sum + state.likeCount, 0);
  const likedCount = selectedLikeStates.filter(state => state.isLiked).length;
  const hasLikedItems = likedCount > 0;
  const allLiked = likedCount === selectedItemIds.length;

  // Button text and icon state
  const getButtonText = () => {
    if (!isAuthenticated) {
      return t('likes.signInToLike', 'Sign in to like items');
    }
    
    if (selectedItemIds.length === 0) {
      return t('likes.selectItemsToLike', 'Select items to like');
    }
    
    if (selectedItemIds.length === 1) {
      const state = selectedLikeStates[0];
      return state.isLiked 
        ? t('likes.unlikeItem', 'Unlike item')
        : t('likes.likeItem', 'Like item');
    }
    
    if (allLiked) {
      return t('likes.unlikeSelected', 'Unlike selected ({{count}})', { count: selectedItemIds.length });
    }
    
    if (hasLikedItems) {
      return t('likes.toggleSelected', 'Toggle likes ({{count}})', { count: selectedItemIds.length });
    }
    
    return t('likes.likeSelected', 'Like selected ({{count}})', { count: selectedItemIds.length });
  };

  const getTooltipText = () => {
    if (!isAuthenticated) {
      return t('likes.authenticationRequired', 'Sign in to like items');
    }
    
    if (!hasSelection) {
      return t('likes.selectItemsFirst', 'Select items using checkboxes to like them');
    }
    
    if (totalLikes > 0) {
      return t('likes.totalLikesCount', 'Total likes: {{count}}', { count: totalLikes });
    }
    
    return t('likes.likeSelectedItems', 'Like the selected items');
  };

  return (
    <Button
      variant={hasLikedItems ? "default" : "outline"}
      size="sm"
      onClick={handleLikeSelected}
      disabled={isDisabled}
      className={cn(
        "transition-all duration-200",
        hasLikedItems && "bg-red-500 hover:bg-red-600 text-white",
        !isAuthenticated && "opacity-50 cursor-not-allowed",
        className
      )}
      title={getTooltipText()}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Heart 
          className={cn(
            "h-4 w-4 mr-2 transition-all duration-200",
            hasLikedItems ? "fill-current" : "stroke-current"
          )} 
        />
      )}
      {getButtonText()}
      {totalLikes > 0 && (
        <span className="ml-2 px-2 py-1 bg-black/20 rounded-full text-xs font-medium">
          {totalLikes}
        </span>
      )}
    </Button>
  );
}