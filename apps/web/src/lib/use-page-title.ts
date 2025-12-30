import { useEffect } from 'react';

/**
 * Hook to set the page title in the browser tab
 * @param title - The page title (will be formatted as "Title | AuditLog")
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | AuditLog` : 'AuditLog';
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

