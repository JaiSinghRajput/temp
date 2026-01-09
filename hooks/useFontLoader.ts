import { useEffect } from 'react';
import { loadCustomFonts } from '@/lib/text-only-canvas-renderer';

/**
 * Hook to preload custom fonts before canvas rendering
 * Useful for ensuring fonts are available throughout the app
 */
export function useFontLoader(fonts?: Array<{ name: string; url: string }>) {
  useEffect(() => {
    if (!fonts || fonts.length === 0) return;

    console.log('[useFontLoader] Pre-loading fonts:', fonts.map(f => f.name));
    
    // Load fonts in the background without blocking
    loadCustomFonts(fonts)
      .then(() => {
        console.log('[useFontLoader] All fonts loaded successfully');
      })
      .catch((err) => {
        console.warn('[useFontLoader] Font pre-loading encountered an error:', err);
      });
  }, [fonts]);
}
