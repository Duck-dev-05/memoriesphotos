"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const lastUpdateRef = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const currentHash = `${data.lastPhotoUpdate}-${data.lastAlbumUpdate}`;
          
          if (lastUpdateRef.current === null) {
            // First load, just store it
            lastUpdateRef.current = currentHash;
          } else if (lastUpdateRef.current !== currentHash) {
            // Data has changed, refresh the router
            lastUpdateRef.current = currentHash;
            router.refresh();
          }
        }
      } catch (e) {
        console.error("AutoRefreshProvider poll error", e);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [router]);

  return <>{children}</>;
}
