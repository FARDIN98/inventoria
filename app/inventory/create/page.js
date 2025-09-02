'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/lib/stores/auth'
import { createInventoryAction, getCategoriesAction } from '@/lib/inventory-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateInventoryPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, loading: authLoading, initialize } = useAuthStore()
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
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
    try {
      setServerError('')
      
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('categoryId', data.categoryId)
      formData.append('tags', JSON.stringify(tags))

      const result = await createInventoryAction(formData)
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        setServerError(result.error || 'Failed to create inventory')
      }
    } catch (error) {
      console.error('Error creating inventory:', error)
      setServerError('An unexpected error occurred')
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/50 dark:from-slate-950 dark:via-emerald-950/30 dark:to-teal-950/50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6 p-6 bg-gradient-to-r from-white/80 to-emerald-50/80 dark:from-slate-900/80 dark:to-emerald-950/80 rounded-xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 hover:text-white px-3 py-1 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('pages.createInventory.backToDashboard')}
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">{t('pages.createInventory.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('pages.createInventory.subtitle')}
          </p>
        </div>

        <Card className="bg-gradient-to-br from-white/90 to-emerald-50/80 dark:from-slate-900/90 dark:to-emerald-950/80 border-emerald-200/50 dark:border-emerald-800/30 shadow-xl backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardTitle className="bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-300 dark:to-teal-300 bg-clip-text text-transparent">{t('pages.createInventory.cardTitle')}</CardTitle>
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
                className={`bg-gradient-to-r from-white to-emerald-50/50 dark:from-slate-800 dark:to-emerald-950/50 border-2 ${errors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-emerald-500 dark:focus:border-emerald-400 shadow-md hover:shadow-lg transition-all duration-200`}
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
                className={`bg-gradient-to-r from-white to-emerald-50/50 dark:from-slate-800 dark:to-emerald-950/50 border-2 ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-emerald-500 dark:focus:border-emerald-400 shadow-md hover:shadow-lg transition-all duration-200`}
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
                  <SelectTrigger className={`bg-gradient-to-r from-white to-emerald-50/50 dark:from-slate-800 dark:to-emerald-950/50 border-2 ${errors.categoryId ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} focus:border-emerald-500 dark:focus:border-emerald-400 shadow-md hover:shadow-lg transition-all duration-200`}>
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
                    className="bg-gradient-to-r from-white to-emerald-50/50 dark:from-slate-800 dark:to-emerald-950/50 border-2 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400 shadow-md hover:shadow-lg transition-all duration-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={!tagInput.trim() || tags.length >= 10}
                    className="bg-white/80 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 hover:text-white hover:border-transparent transition-all duration-200"
                  >
                    {t('actions.add')}
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center transition-all duration-200"
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
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50 border border-red-200 dark:border-red-800 shadow-lg">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{serverError}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={isSubmitting}
                className="bg-white/80 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600 hover:bg-gradient-to-r hover:from-gray-500 hover:to-slate-500 hover:text-white hover:border-transparent transition-all duration-200"
              >
                {t('actions.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !watchedCategoryId || loadingCategories}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('pages.createInventory.creating')}
                  </>
                ) : (
                  t('pages.createInventory.createInventory')
                )}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}