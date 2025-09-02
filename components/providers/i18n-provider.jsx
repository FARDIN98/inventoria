'use client';

import { useEffect, useState } from 'react';
import { initI18n } from '../../lib/i18n';

export function I18nProvider({ children }) {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    // Initialize i18n only on client-side to prevent build issues
    const init = async () => {
      try {
        await initI18n();
        setIsI18nReady(true);
      } catch (error) {
        console.warn('i18n initialization failed:', error);
        setIsI18nReady(true); // Continue anyway
      }
    };

    init();
  }, []);

  // Wait for i18n to be ready before rendering children
  if (!isI18nReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return children;
}