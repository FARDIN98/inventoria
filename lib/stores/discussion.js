import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getDiscussionPostsAction,
  addDiscussionPostAction,
  deleteDiscussionPostAction
} from '@/lib/discussion-actions'
import { supabase } from '@/lib/supabase'

/**
 * Connection states for real-time subscription
 */
const CONNECTION_STATES = {
  LOADING: 'loading',
  CONNECTED: 'connected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected'
}

/**
 * Discussion store for managing discussion-related state
 * Handles posts, real-time subscriptions, and CRUD operations
 */
const useDiscussionStore = create(
  persist(
    (set, get) => ({
      // State
      postsByInventory: {}, // { inventoryId: { posts: [], optimisticPosts: [] } }
      connectionStates: {}, // { inventoryId: 'connected' | 'loading' | 'error' }
      errors: {}, // { inventoryId: 'error message' }
      submittingStates: {}, // { inventoryId: boolean }
      channels: {}, // { inventoryId: channel }
      scrollRefs: {}, // { inventoryId: ref }
      
      // Actions
      setPostsForInventory: (inventoryId, posts) => {
        const state = get()
        set({
          postsByInventory: {
            ...state.postsByInventory,
            [inventoryId]: {
              ...state.postsByInventory[inventoryId],
              posts
            }
          }
        })
      },

      setOptimisticPostsForInventory: (inventoryId, optimisticPosts) => {
        const state = get()
        set({
          postsByInventory: {
            ...state.postsByInventory,
            [inventoryId]: {
              ...state.postsByInventory[inventoryId],
              optimisticPosts
            }
          }
        })
      },

      setConnectionState: (inventoryId, connectionState) => {
        const state = get()
        set({
          connectionStates: {
            ...state.connectionStates,
            [inventoryId]: connectionState
          }
        })
      },

      setError: (inventoryId, error) => {
        const state = get()
        set({
          errors: {
            ...state.errors,
            [inventoryId]: error
          }
        })
      },

      setSubmittingState: (inventoryId, isSubmitting) => {
        const state = get()
        set({
          submittingStates: {
            ...state.submittingStates,
            [inventoryId]: isSubmitting
          }
        })
      },

      setChannel: (inventoryId, channel) => {
        const state = get()
        set({
          channels: {
            ...state.channels,
            [inventoryId]: channel
          }
        })
      },

      setScrollRef: (inventoryId, ref) => {
        const state = get()
        set({
          scrollRefs: {
            ...state.scrollRefs,
            [inventoryId]: ref
          }
        })
      },

      // Get combined posts (real + optimistic) for an inventory
      getPostsForInventory: (inventoryId) => {
        const state = get()
        const inventoryData = state.postsByInventory[inventoryId] || { posts: [], optimisticPosts: [] }
        const combined = [...inventoryData.posts, ...inventoryData.optimisticPosts]
        return combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      },

      // Get connection state for an inventory
      getConnectionState: (inventoryId) => {
        const state = get()
        return state.connectionStates[inventoryId] || CONNECTION_STATES.LOADING
      },

      // Get error for an inventory
      getError: (inventoryId) => {
        const state = get()
        return state.errors[inventoryId] || null
      },

      // Get submitting state for an inventory
      getSubmittingState: (inventoryId) => {
        const state = get()
        return state.submittingStates[inventoryId] || false
      },

      // Initialize inventory data
      initializeInventory: (inventoryId) => {
        const state = get()
        if (!state.postsByInventory[inventoryId]) {
          set({
            postsByInventory: {
              ...state.postsByInventory,
              [inventoryId]: { posts: [], optimisticPosts: [] }
            },
            connectionStates: {
              ...state.connectionStates,
              [inventoryId]: CONNECTION_STATES.LOADING
            },
            errors: {
              ...state.errors,
              [inventoryId]: null
            },
            submittingStates: {
              ...state.submittingStates,
              [inventoryId]: false
            }
          })
        }
      },

      // Fetch initial posts
      fetchInitialPosts: async (inventoryId, initialPosts = null) => {
        const { setConnectionState, setError, setPostsForInventory } = get()
        
        try {
          setConnectionState(inventoryId, CONNECTION_STATES.LOADING)
          setError(inventoryId, null)
          
          // Use initial posts from SSR if provided
          if (initialPosts !== null) {
            setPostsForInventory(inventoryId, initialPosts)
            setConnectionState(inventoryId, CONNECTION_STATES.CONNECTED)
            return { success: true, posts: initialPosts }
          }
          
          // Fallback to fetching from server
          const result = await getDiscussionPostsAction(inventoryId)
          
          if (result.success) {
            setPostsForInventory(inventoryId, result.posts || [])
            setConnectionState(inventoryId, CONNECTION_STATES.CONNECTED)
            return { success: true, posts: result.posts || [] }
          } else {
            throw new Error(result.error || 'Failed to fetch posts')
          }
        } catch (err) {
          console.error('Error fetching initial posts:', err)
          setError(inventoryId, err.message)
          setConnectionState(inventoryId, CONNECTION_STATES.ERROR)
          return { success: false, error: err.message }
        }
      },

      // Setup real-time subscription
      setupRealtimeSubscription: (inventoryId, options = {}) => {
        const { autoScroll = true } = options
        const state = get()
        const { setConnectionState, setError, setPostsForInventory, setOptimisticPostsForInventory, setChannel } = get()
        
        // Clean up existing subscription
        const existingChannel = state.channels[inventoryId]
        if (existingChannel) {
          supabase.removeChannel(existingChannel)
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
              console.log('📨 New discussion post received:', payload.new)
              
              const currentState = get()
              const currentPosts = currentState.postsByInventory[inventoryId]?.posts || []
              
              // Check if post already exists (prevent duplicates)
              const exists = currentPosts.some(post => post.id === payload.new.id)
              if (!exists) {
                setPostsForInventory(inventoryId, [...currentPosts, payload.new])
              }
              
              // Remove from optimistic posts if it exists
              const currentOptimistic = currentState.postsByInventory[inventoryId]?.optimisticPosts || []
              setOptimisticPostsForInventory(
                inventoryId,
                currentOptimistic.filter(post => post.tempId !== payload.new.id)
              )
              
              // Auto-scroll if enabled
              if (autoScroll) {
                const scrollRef = currentState.scrollRefs[inventoryId]
                if (scrollRef?.current) {
                  setTimeout(() => {
                    scrollRef.current.scrollTo({
                      top: scrollRef.current.scrollHeight,
                      behavior: 'smooth'
                    })
                  }, 50)
                }
              }
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
              console.log('🗑️ Discussion post deleted:', payload.old)
              
              const currentState = get()
              const currentPosts = currentState.postsByInventory[inventoryId]?.posts || []
              setPostsForInventory(
                inventoryId,
                currentPosts.filter(post => post.id !== payload.old.id)
              )
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
              console.log('✏️ Discussion post updated:', payload.new)
              
              const currentState = get()
              const currentPosts = currentState.postsByInventory[inventoryId]?.posts || []
              setPostsForInventory(
                inventoryId,
                currentPosts.map(post => post.id === payload.new.id ? payload.new : post)
              )
            }
          )
          .subscribe((status) => {
            console.log('🔌 Subscription status:', status)
            
            switch (status) {
              case 'SUBSCRIBED':
                setConnectionState(inventoryId, CONNECTION_STATES.CONNECTED)
                setError(inventoryId, null)
                break
              case 'CHANNEL_ERROR':
                setConnectionState(inventoryId, CONNECTION_STATES.ERROR)
                setError(inventoryId, 'Failed to connect to real-time updates')
                break
              case 'TIMED_OUT':
                setConnectionState(inventoryId, CONNECTION_STATES.RECONNECTING)
                break
              case 'CLOSED':
                setConnectionState(inventoryId, CONNECTION_STATES.DISCONNECTED)
                break
              default:
                break
            }
          })

        setChannel(inventoryId, channel)
      },

      // Add a new discussion post with optimistic updates
      addPost: async (inventoryId, content) => {
        const { setSubmittingState, setOptimisticPostsForInventory, getSubmittingState } = get()
        
        if (!content?.trim() || getSubmittingState(inventoryId)) {
          return { success: false, error: 'Invalid content' }
        }
        
        const tempId = `temp_${Date.now()}_${Math.random()}`
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
        }
        
        try {
          setSubmittingState(inventoryId, true)
          
          // Add optimistic post immediately
          const currentState = get()
          const currentOptimistic = currentState.postsByInventory[inventoryId]?.optimisticPosts || []
          setOptimisticPostsForInventory(inventoryId, [...currentOptimistic, optimisticPost])
          
          // Auto-scroll to show new post
          const scrollRef = currentState.scrollRefs[inventoryId]
          if (scrollRef?.current) {
            setTimeout(() => {
              scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
              })
            }, 50)
          }
          
          // Submit to server
          const result = await addDiscussionPostAction(inventoryId, content.trim())
          
          if (result.success) {
            // Remove optimistic post - real post will come via subscription
            const updatedState = get()
            const updatedOptimistic = updatedState.postsByInventory[inventoryId]?.optimisticPosts || []
            setOptimisticPostsForInventory(
              inventoryId,
              updatedOptimistic.filter(post => post.tempId !== tempId)
            )
            return { success: true, post: result.post }
          } else {
            // Remove failed optimistic post
            const updatedState = get()
            const updatedOptimistic = updatedState.postsByInventory[inventoryId]?.optimisticPosts || []
            setOptimisticPostsForInventory(
              inventoryId,
              updatedOptimistic.filter(post => post.tempId !== tempId)
            )
            throw new Error(result.error)
          }
        } catch (err) {
          console.error('Error adding post:', err)
          
          // Remove failed optimistic post
          const updatedState = get()
          const updatedOptimistic = updatedState.postsByInventory[inventoryId]?.optimisticPosts || []
          setOptimisticPostsForInventory(
            inventoryId,
            updatedOptimistic.filter(post => post.tempId !== tempId)
          )
          
          return { success: false, error: err.message }
        } finally {
          setSubmittingState(inventoryId, false)
        }
      },

      // Delete a discussion post
      deletePost: async (postId) => {
        try {
          const result = await deleteDiscussionPostAction(postId)
          
          if (!result.success) {
            throw new Error(result.error)
          }
          
          return { success: true }
        } catch (err) {
          console.error('Error deleting post:', err)
          return { success: false, error: err.message }
        }
      },

      // Retry connection
      retryConnection: (inventoryId, options = {}) => {
        const { setConnectionState, setupRealtimeSubscription, fetchInitialPosts } = get()
        setConnectionState(inventoryId, CONNECTION_STATES.RECONNECTING)
        setupRealtimeSubscription(inventoryId, options)
        fetchInitialPosts(inventoryId)
      },

      // Cleanup inventory data
      cleanupInventory: (inventoryId) => {
        const state = get()
        const channel = state.channels[inventoryId]
        
        if (channel) {
          supabase.removeChannel(channel)
        }
        
        const {
          [inventoryId]: removedPosts,
          ...restPosts
        } = state.postsByInventory
        
        const {
          [inventoryId]: removedConnection,
          ...restConnections
        } = state.connectionStates
        
        const {
          [inventoryId]: removedError,
          ...restErrors
        } = state.errors
        
        const {
          [inventoryId]: removedSubmitting,
          ...restSubmitting
        } = state.submittingStates
        
        const {
          [inventoryId]: removedChannel,
          ...restChannels
        } = state.channels
        
        const {
          [inventoryId]: removedScrollRef,
          ...restScrollRefs
        } = state.scrollRefs
        
        set({
          postsByInventory: restPosts,
          connectionStates: restConnections,
          errors: restErrors,
          submittingStates: restSubmitting,
          channels: restChannels,
          scrollRefs: restScrollRefs
        })
      },

      // Clear all state
      clearState: () => {
        const state = get()
        
        // Cleanup all channels
        Object.values(state.channels).forEach(channel => {
          if (channel) {
            supabase.removeChannel(channel)
          }
        })
        
        set({
          postsByInventory: {},
          connectionStates: {},
          errors: {},
          submittingStates: {},
          channels: {},
          scrollRefs: {}
        })
      }
    }),
    {
      name: 'discussion-store',
      // Only persist non-function values and exclude channels/refs
      partialize: (state) => ({
        postsByInventory: state.postsByInventory,
        connectionStates: state.connectionStates,
        errors: state.errors,
        submittingStates: state.submittingStates
      })
    }
  )
)

export { CONNECTION_STATES }
export default useDiscussionStore