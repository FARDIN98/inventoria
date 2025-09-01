'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * LikeCount component for displaying like counts in table rows
 * Purely visual component with no interactive functionality
 * 
 * @param {number} likeCount - Number of likes for the item
 * @param {boolean} showZero - Whether to show "0" when no likes (default: false)
 * @param {string} size - Size variant: 'sm', 'md', 'lg' (default: 'sm')
 * @param {string} className - Additional CSS classes
 */
export default function LikeCount({
  likeCount = 0,
  showZero = false,
  size = 'sm',
  className
}) {
  const { t } = useTranslation();

  // Don't render if count is 0 and showZero is false
  const shouldRender = useMemo(() => {
    return likeCount > 0 || showZero;
  }, [likeCount, showZero]);

  // Size-based styling
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'lg':
        return 'text-base';
      case 'md':
        return 'text-sm';
      case 'sm':
      default:
        return 'text-xs';
    }
  }, [size]);

  // Format the display text
  const displayText = useMemo(() => {
    if (likeCount === 0) {
      return showZero ? '0' : '';
    }
    
    // Format large numbers (1000+ as 1K, etc.)
    if (likeCount >= 1000000) {
      return `${(likeCount / 1000000).toFixed(1)}M`;
    }
    if (likeCount >= 1000) {
      return `${(likeCount / 1000).toFixed(1)}K`;
    }
    
    return likeCount.toString();
  }, [likeCount, showZero]);

  // Accessibility label
  const ariaLabel = useMemo(() => {
    if (likeCount === 0) {
      return t('likes.noLikes', 'No likes');
    }
    if (likeCount === 1) {
      return t('likes.oneLike', '1 like');
    }
    return t('likes.multipleLikes', '{{count}} likes', { count: likeCount });
  }, [likeCount, t]);

  if (!shouldRender) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-muted-foreground font-medium transition-colors",
        sizeClasses,
        likeCount > 0 && "text-red-500",
        className
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span className="select-none">{displayText}</span>
      <span className="select-none" role="img" aria-hidden="true">
        ❤️
      </span>
    </span>
  );
}

/**
 * Compact variant of LikeCount for tight spaces
 * Shows only the heart emoji when count is 0, number + heart when > 0
 */
export function LikeCountCompact({
  likeCount = 0,
  className
}) {
  const { t } = useTranslation();

  const ariaLabel = useMemo(() => {
    if (likeCount === 0) {
      return t('likes.noLikes', 'No likes');
    }
    if (likeCount === 1) {
      return t('likes.oneLike', '1 like');
    }
    return t('likes.multipleLikes', '{{count}} likes', { count: likeCount });
  }, [likeCount, t]);

  return (
    <span
      className={cn(
        "inline-flex items-center text-xs text-muted-foreground",
        likeCount > 0 && "text-red-500 font-medium",
        className
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {likeCount > 0 && (
        <span className="mr-1 select-none">{likeCount}</span>
      )}
      <span className="select-none" role="img" aria-hidden="true">
        ❤️
      </span>
    </span>
  );
}

/**
 * Badge variant of LikeCount for emphasis
 * Renders as a small badge with background color
 */
export function LikeCountBadge({
  likeCount = 0,
  showZero = false,
  className
}) {
  const { t } = useTranslation();

  const shouldRender = likeCount > 0 || showZero;
  
  const ariaLabel = useMemo(() => {
    if (likeCount === 0) {
      return t('likes.noLikes', 'No likes');
    }
    if (likeCount === 1) {
      return t('likes.oneLike', '1 like');
    }
    return t('likes.multipleLikes', '{{count}} likes', { count: likeCount });
  }, [likeCount, t]);

  if (!shouldRender) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        likeCount > 0 
          ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          : "bg-muted text-muted-foreground",
        className
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span className="select-none">{likeCount}</span>
      <span className="select-none" role="img" aria-hidden="true">
        ❤️
      </span>
    </span>
  );
}