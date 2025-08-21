"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '@/lib/stores/auth'
import InventoryTable from '@/components/InventoryTable'
import TagCloud from '@/components/TagCloud'

// Dummy data for latest inventories
const latestInventories = [
  {
    id: 1,
    title: "Vintage Camera Collection",
    description: "A curated collection of vintage cameras from the 1950s-1980s",
    image: "/api/placeholder/60/60",
    creator: "John Photography"
  },
  {
    id: 2,
    title: "Rare Book Library",
    description: "First edition books and manuscripts from renowned authors",
    image: "/api/placeholder/60/60",
    creator: "Sarah Literature"
  },
  {
    id: 3,
    title: "Antique Furniture Catalog",
    description: "Victorian and Art Deco furniture pieces",
    image: "/api/placeholder/60/60",
    creator: "Mike Antiques"
  },
  {
    id: 4,
    title: "Coin Collection Database",
    description: "Rare coins from different countries and time periods",
    image: "/api/placeholder/60/60",
    creator: "Emma Numismatics"
  },
  {
    id: 5,
    title: "Art Supplies Inventory",
    description: "Professional art supplies and materials catalog",
    image: "/api/placeholder/60/60",
    creator: "David Arts"
  }
]

// Dummy data for popular inventories
const popularInventories = [
  {
    id: 6,
    title: "Gaming Console Archive",
    description: "Retro gaming consoles and accessories collection",
    image: "/api/placeholder/60/60",
    creator: "Alex Gaming"
  },
  {
    id: 7,
    title: "Wine Cellar Catalog",
    description: "Premium wines from various regions and vintages",
    image: "/api/placeholder/60/60",
    creator: "Robert Sommelier"
  },
  {
    id: 8,
    title: "Stamp Collection Registry",
    description: "Rare and commemorative stamps from around the world",
    image: "/api/placeholder/60/60",
    creator: "Lisa Philately"
  },
  {
    id: 9,
    title: "Musical Instruments Hub",
    description: "Vintage and modern musical instruments inventory",
    image: "/api/placeholder/60/60",
    creator: "Tom Music"
  },
  {
    id: 10,
    title: "Sports Memorabilia",
    description: "Authentic sports collectibles and memorabilia",
    image: "/api/placeholder/60/60",
    creator: "Chris Sports"
  }
]

// Popular tags for the tag cloud
const popularTags = [
  { name: "vintage", count: 45 },
  { name: "collectibles", count: 38 },
  { name: "antique", count: 32 },
  { name: "rare", count: 28 },
  { name: "books", count: 25 },
  { name: "art", count: 22 },
  { name: "furniture", count: 20 },
  { name: "electronics", count: 18 },
  { name: "coins", count: 16 },
  { name: "stamps", count: 14 },
  { name: "music", count: 12 },
  { name: "sports", count: 10 },
  { name: "photography", count: 8 },
  { name: "gaming", count: 6 }
]

export default function HomePage() {
  const { user, loading, initialize } = useAuthStore()
  const router = useRouter()

  // Initialize auth state on component mount
  useEffect(() => {
    initialize()
  }, [])

  // No redirect needed - authenticated users can view the home page

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Render content for both authenticated and non-authenticated users

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Welcome to Inventoria
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Discover and explore amazing inventory collections from creators around the world. 
              Join our community to create and share your own collections.
            </p>
          </div>
        </div>
      </section>

      {/* Latest Inventories Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Latest Inventories
            </h2>
            <p className="text-muted-foreground">
              Recently created inventory collections
            </p>
          </div>
          <InventoryTable 
            data={latestInventories} 
            title="Latest Inventories"
          />
        </div>
      </section>

      {/* Popular Inventories Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Top 5 Popular Inventories
            </h2>
            <p className="text-muted-foreground">
              Most viewed and liked inventory collections
            </p>
          </div>
          <InventoryTable 
            data={popularInventories} 
            title="Top 5 Popular Inventories"
          />
        </div>
      </section>

      {/* Tag Cloud Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Popular Tags
            </h2>
            <p className="text-muted-foreground">
              Explore collections by popular categories
            </p>
          </div>
          <TagCloud tags={popularTags} />
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
            Ready to Start Your Collection?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of collectors and create your own inventory collections today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/register" 
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              Get Started
            </a>
            <a 
              href="/login" 
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              Sign In
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
