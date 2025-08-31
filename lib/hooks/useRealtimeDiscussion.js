'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getDiscussionPostsAction, addDiscussionPostAction, deleteDiscussionPostAction } from '@/lib/discussion-actions';

/**
 * Connection states for real-time subscription
 */
const CONNECTION_STATES = {
  LOADING: 'loading',
  CONNECTED: 'connected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected'
};

/**
 * Custom hook for real-time discussion posts with Supabase subscriptions
 * Provides instant updates, optimistic UI, and auto-scroll functionality
 * 
 * @param {string} inventoryId - The inventory ID to subscribe to
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoScroll - Enable auto-scroll to bottom on new posts (default: true)
 * @param {number} options.scrollThreshold - Distance from bottom to trigger auto-scroll (default: 100)
 * @param {Array} options.initialPosts - Initial posts from SSR to prevent loading flash (default: null)
 * @returns {Object} - Hook state and methods
 */
export function useRealtimeDiscussion(inventoryId, options = {}) {
  const {
    autoScroll = true,
    scrollThreshold = 100,
    initialPosts = null
  } = options;

  // State management
  const [posts, setPosts] = useState([]);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.LOADING);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState([]);

  // Refs for scroll management
  const scrollContainerRef = useRef(null);
  const channelRef = useRef(null);
  const isNearBottomRef = useRef(true);

  /**
   * Check if user is near the bottom of the scroll container
   */
  const checkIfNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    return distanceFromBottom <= scrollThreshold;
  }, [scrollThreshold]);

  /**
   * Scroll to bottom of container
   */
  const scrollToBottom = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  /**
   * Handle scroll events to track user position
   */
  const handleScroll = useCallback(() => {
    isNearBottomRef.current = checkIfNearBottom();
  }, [checkIfNearBottom]);

  /**
   * Fetch initial posts from server or use provided initial posts
   */
  const fetchInitialPosts = useCallback(async () => {
    if (!inventoryId) return;
    
    try {
      setConnectionState(CONNECTION_STATES.LOADING);
      setError(null);
      
      // Use initial posts from SSR if provided
      if (initialPosts !== null) {
        setPosts(initialPosts);
        setConnectionState(CONNECTION_STATES.CONNECTED);
        
        // Auto-scroll to bottom on initial load
        setTimeout(() => {
          if (autoScroll) {
            scrollToBottom();
          }
        }, 100);
        return;
      }
      
      // Fallback to fetching from server
      const result = await getDiscussionPostsAction(inventoryId);
      
      if (result.success) {
        setPosts(result.posts || []);
        setConnectionState(CONNECTION_STATES.CONNECTED);
        
        // Auto-scroll to bottom on initial load
        setTimeout(() => {
          if (autoScroll) {
            scrollToBottom();
          }
        }, 100);
      } else {
        throw new Error(result.error || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching initial posts:', err);
      setError(err.message);
      setConnectionState(CONNECTION_STATES.ERROR);
    }
  }, [inventoryId, autoScroll, scrollToBottom, initialPosts]);

  /**
   * Setup real-time subscription
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (!inventoryId) return;

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new channel for this inventory
    const channel = supabase
      .channel(`discussion_posts:${inventoryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discussion_posts',
          filter: `inventoryId=eq.${inventoryId}`
        },
        (payload) => {
          console.log('📨 New discussion post received:', payload.new);
          
          // Add new post to the end (linear order)
          setPosts(currentPosts => {
            // Check if post already exists (prevent duplicates)
            const exists = currentPosts.some(post => post.id === payload.new.id);
            if (exists) return currentPosts;
            
            const newPosts = [...currentPosts, payload.new];
            
            // Auto-scroll if user is near bottom
            setTimeout(() => {
              if (autoScroll && isNearBottomRef.current) {
                scrollToBottom();
              }
            }, 50);
            
            return newPosts;
          });
          
          // Remove from optimistic posts if it exists
          setOptimisticPosts(current => 
            current.filter(post => post.tempId !== payload.new.id)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'discussion_posts',
          filter: `inventoryId=eq.${inventoryId}`
        },
        (payload) => {
          console.log('🗑️ Discussion post deleted:', payload.old);
          
          // Remove deleted post from state
          setPosts(currentPosts => 
            currentPosts.filter(post => post.id !== payload.old.id)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'discussion_posts',
          filter: `inventoryId=eq.${inventoryId}`
        },
        (payload) => {
          console.log('✏️ Discussion post updated:', payload.new);
          
          // Update existing post in state
          setPosts(currentPosts => 
            currentPosts.map(post => 
              post.id === payload.new.id ? payload.new : post
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('🔌 Subscription status:', status);
        
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionState(CONNECTION_STATES.CONNECTED);
            setError(null);
            break;
          case 'CHANNEL_ERROR':
            setConnectionState(CONNECTION_STATES.ERROR);
            setError('Failed to connect to real-time updates');
            break;
          case 'TIMED_OUT':
            setConnectionState(CONNECTION_STATES.RECONNECTING);
            break;
          case 'CLOSED':
            setConnectionState(CONNECTION_STATES.DISCONNECTED);
            break;
          default:
            break;
        }
      });

    channelRef.current = channel;
  }, [inventoryId, autoScroll, scrollToBottom]);

  /**
   * Add a new discussion post with optimistic updates
   */
  const addPost = useCallback(async (content) => {
    if (!content?.trim() || isSubmitting) return { success: false, error: 'Invalid content' };
    
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticPost = {
      id: tempId,
      tempId,
      inventoryId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'current-user',
        name: 'You',
        email: '',
        image: null
      },
      isOptimistic: true
    };
    
    try {
      setIsSubmitting(true);
      
      // Add optimistic post immediately
      setOptimisticPosts(current => [...current, optimisticPost]);
      
      // Auto-scroll to show new post
      setTimeout(() => {
        if (autoScroll) {
          scrollToBottom();
        }
      }, 50);
      
      // Submit to server
      const result = await addDiscussionPostAction(inventoryId, content.trim());
      
      if (result.success) {
        // Remove optimistic post - real post will come via subscription
        setOptimisticPosts(current => 
          current.filter(post => post.tempId !== tempId)
        );
        return { success: true, post: result.post };
      } else {
        // Remove failed optimistic post
        setOptimisticPosts(current => 
          current.filter(post => post.tempId !== tempId)
        );
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error adding post:', err);
      
      // Remove failed optimistic post
      setOptimisticPosts(current => 
        current.filter(post => post.tempId !== tempId)
      );
      
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  }, [inventoryId, isSubmitting, autoScroll, scrollToBottom]);

  /**
   * Delete a discussion post
   */
  const deletePost = useCallback(async (postId) => {
    try {
      const result = await deleteDiscussionPostAction(postId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting post:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Retry connection
   */
  const retryConnection = useCallback(() => {
    setConnectionState(CONNECTION_STATES.RECONNECTING);
    setupRealtimeSubscription();
    fetchInitialPosts();
  }, [setupRealtimeSubscription, fetchInitialPosts]);

  /**
   * Combined posts (real + optimistic) in chronological order
   */
  const allPosts = useMemo(() => {
    const combined = [...posts, ...optimisticPosts];
    return combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [posts, optimisticPosts]);

  /**
   * Connection status helpers
   */
  const isLoading = connectionState === CONNECTION_STATES.LOADING;
  const isConnected = connectionState === CONNECTION_STATES.CONNECTED;
  const isError = connectionState === CONNECTION_STATES.ERROR;
  const isReconnecting = connectionState === CONNECTION_STATES.RECONNECTING;

  // Initialize subscription and fetch posts
  useEffect(() => {
    if (!inventoryId) return;
    
    fetchInitialPosts();
    setupRealtimeSubscription();
    
    // Cleanup on unmount or inventoryId change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [inventoryId, fetchInitialPosts, setupRealtimeSubscription]);

  // Setup scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return {
    // Data
    posts: allPosts,
    
    // Connection state
    connectionState,
    isLoading,
    isConnected,
    isError,
    isReconnecting,
    error,
    
    // Submission state
    isSubmitting,
    
    // Actions
    addPost,
    deletePost,
    retryConnection,
    scrollToBottom,
    
    // Refs for scroll management
    scrollContainerRef,
    
    // Utilities
    checkIfNearBottom
  };
}

export default useRealtimeDiscussion;