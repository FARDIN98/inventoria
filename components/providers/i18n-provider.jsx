'use client';

import { useEffect } from 'react';
import '../../lib/i18n'; // Initialize i18n

export function I18nProvider({ children }) {
  useEffect(() => {
    // i18n is already initialized by the import above
    // This component just ensures it's loaded on the client side
  }, []);

  return children;
}