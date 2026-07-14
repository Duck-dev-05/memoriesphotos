'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AutoRefresh({ interval = 5000 }: { interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      // Only refresh if document is visible to save resources and avoid unnecessary requests
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, interval);

    return () => clearInterval(id);
  }, [router, interval]);

  return null;
}
