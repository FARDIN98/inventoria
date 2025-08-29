'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/lib/stores/auth'
import { editInventoryAction, getCategoriesAction, getInventoryByIdAction, getUserInventoriesAction } from '@/lib/inventory-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function EditInventoryPageContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const inventoryId = searchParams.get('id')
  const { user, loading: authLoading, initialize } = useAuthStore()
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [inventory, setInventory] = useState(null)
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      categoryId: ''
    }
  })

  const watchedCategoryId = watch('categoryId')

  // Initialize auth and redirect if not authenticated
  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Redirect if no inventory ID provided
  useEffect(() => {
    if (!inventoryId) {
      router.push('/dashboard')
    }
  }, [inventoryId, router])

  // Load inventory data
  useEffect(() => {
    async function loadInventory() {
      if (!inventoryId || !user) return
      
      try {
        const result = await getInventoryByIdAction(inventoryId)
        if (result.success) {
          const inv = result.inventory
          
          // Check if user owns this inventory, is admin, or inventory is public
          // First check if user is admin
          const userResult = await getUserInventoriesAction()
          const isAdmin = userResult.isAdmin
          
          // Allow access if: owner, admin, or public inventory
          if (inv.ownerId !== user.id && !isAdmin && !inv.isPublic) {
            router.push('/dashboard')
            return
          }
          
          setInventory(inv)
          
          // Set form default values
          reset({
            title: inv.title || '',
            description: inv.description || '',
            categoryId: inv.categoryId || ''
          })
          
          // Set tags
          if (inv.inventory_tags && inv.inventory_tags.length > 0) {
            setTags(inv.inventory_tags.map(tagRelation => tagRelation.tags?.name).filter(Boolean))
          }
        } else {
          setServerError('Inventory not found or access denied')
          setTimeout(() => router.push('/dashboard'), 2000)
        }
      } catch (error) {
        console.error('Error loading inventory:', error)
        setServerError('Failed to load inventory')
      } finally {
        setLoadingInventory(false)
      }
    }

    if (user && inventoryId) {
      loadInventory()
    }
  }, [user, inventoryId, reset, router])

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const result = await getCategoriesAction()
        if (result.success) {
          setCategories(result.categories)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setLoadingCategories(false)
      }
    }

    if (user) {
      loadCategories()
    }
  }, [user])

  // Handle tag input
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  const addTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  // Handle form submission
  const onSubmit = async (data) => {
    if (!inventory) return
    
    try {
      setServerError('')
      
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('categoryId', data.categoryId)
      formData.append('tags', JSON.stringify(tags))

      const result = await editInventoryAction(inventoryId, formData, inventory.version)
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        setServerError(result.error || 'Failed to update inventory')
      }
    } catch (error) {
      console.error('Error updating inventory:', error)
      setServerError('An unexpected error occurred')
    }
  }

  // Show loading while checking authentication or loading data
  if (authLoading || loadingInventory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Don't render if not authenticated or no inventory (will redirect)
  if (!user || !inventory) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('pages.createInventory.backToDashboard')}
        </Link>
        <h1 className="text-3xl font-bold">{t('pages.editInventory.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('pages.editInventory.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.createInventory.cardTitle')}</CardTitle>
          <CardDescription>
            {t('pages.createInventory.cardDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('forms.title')} *</Label>
              <Input
                id="title"
                {...register('title', { 
                  required: t('forms.validation.titleRequired'),
                  minLength: {
                    value: 3,
                    message: t('forms.validation.titleMinLength')
                  },
                  maxLength: {
                    value: 100,
                    message: t('forms.validation.titleMaxLength')
                  }
                })}
                placeholder={t('forms.placeholder.title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('forms.description')}</Label>
              <Textarea
                id="description"
                {...register('description', {
                  maxLength: {
                    value: 500,
                    message: t('forms.validation.descriptionMaxLength')
                  }
                })}
                placeholder={t('forms.placeholder.description')}
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('forms.category')} *</Label>
              {loadingCategories ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">{t('pages.createInventory.loadingCategories')}</span>
                </div>
              ) : (
                <Select
                  value={watchedCategoryId}
                  onValueChange={(value) => setValue('categoryId', value)}
                >
                  <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('forms.placeholder.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!watchedCategoryId && (
                <p className="text-sm text-red-500">{t('forms.validation.categoryRequired')}</p>
              )}
            </div>

            {/* Tags Field */}
            <div className="space-y-2">
              <Label htmlFor="tags">{t('forms.tags')}</Label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    placeholder={t('forms.placeholder.tags')}
                    disabled={tags.length >= 10}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={!tagInput.trim() || tags.length >= 10}
                  >
                    {t('actions.add')}
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('pages.createInventory.tagsAdded', { count: tags.length })}
                </p>
              </div>
            </div>

            {/* Server Error */}
            {serverError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{serverError}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={isSubmitting}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !watchedCategoryId || loadingCategories}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('pages.editInventory.updating')}
                  </>
                ) : (
                  t('pages.editInventory.updateInventory')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EditInventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <EditInventoryPageContent />
    </Suspense>
  )
}