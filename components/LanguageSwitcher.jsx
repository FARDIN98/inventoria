"use client"

import useLanguageStore from '@/lib/stores/language'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Language Switcher component for changing UI language
 * Integrates with Zustand language store and i18next for immediate UI updates
 * Supports English and Spanish with flag icons
 * 
 * @returns {JSX.Element} Language selector dropdown
 */
export default function LanguageSwitcher() {
  const { currentLanguage, loading, setLanguage } = useLanguageStore()

  const handleLanguageChange = (language) => {
    setLanguage(language)
  }

  const languages = {
    en: { label: '🇺🇸 English', value: 'en' },
    es: { label: '🇪🇸 Español', value: 'es' }
  }

  return (
    <div className="flex items-center">
      <span className="sr-only">Language</span>
      <Select
        value={currentLanguage}
        onValueChange={handleLanguageChange}
        disabled={loading}
      >
        <SelectTrigger className="w-24 md:w-32 text-sm">
          <SelectValue>
            {languages[currentLanguage]?.label || '🇺🇸 English'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">
            🇺🇸 English
          </SelectItem>
          <SelectItem value="es">
            🇪🇸 Español
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}