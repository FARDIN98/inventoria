"use client"

import { useMemo } from 'react'

export default function TagCloud({ tags }) {
  // Calculate font sizes based on tag counts
  const tagsWithSizes = useMemo(() => {
    if (!tags || tags.length === 0) return []
    
    const maxCount = Math.max(...tags.map(tag => tag.count))
    const minCount = Math.min(...tags.map(tag => tag.count))
    
    return tags.map(tag => {
      // Calculate relative size (1-4 scale)
      const relativeSize = minCount === maxCount 
        ? 2 
        : 1 + (3 * (tag.count - minCount) / (maxCount - minCount))
      
      let sizeClass = 'text-sm'
      let opacity = 'opacity-70'
      
      if (relativeSize >= 3.5) {
        sizeClass = 'text-2xl font-bold'
        opacity = 'opacity-100'
      } else if (relativeSize >= 2.5) {
        sizeClass = 'text-xl font-semibold'
        opacity = 'opacity-90'
      } else if (relativeSize >= 1.5) {
        sizeClass = 'text-lg font-medium'
        opacity = 'opacity-80'
      }
      
      return {
        ...tag,
        sizeClass,
        opacity
      }
    })
  }, [tags])

  if (!tags || tags.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tags available.</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border p-8">
      <div className="flex flex-wrap items-center justify-center gap-4 leading-relaxed">
        {tagsWithSizes.map((tag, index) => (
          <button
            key={tag.name}
            className={`
              ${tag.sizeClass} 
              ${tag.opacity}
              text-foreground 
              hover:text-primary 
              hover:opacity-100 
              transition-all 
              duration-200 
              hover:scale-110
              cursor-pointer
              px-2 
              py-1 
              rounded-md 
              hover:bg-muted/50
            `}
            onClick={() => {
              // TODO: Implement tag filtering functionality
              console.log(`Clicked tag: ${tag.name}`)
            }}
            title={`${tag.count} items tagged with "${tag.name}"`}
          >
            {tag.name}
          </button>
        ))}
      </div>
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Click on any tag to explore related collections
        </p>
      </div>
    </div>
  )
}