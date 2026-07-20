"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F for Search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        router.push("/search");
      }
      
      // Alt-based navigation shortcuts
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'h': e.preventDefault(); router.push('/'); break;
          case 't': e.preventDefault(); router.push('/timeline'); break;
          case 'a': e.preventDefault(); router.push('/albums'); break;
          case 'u': e.preventDefault(); router.push('/upload'); break;
          case 'f': e.preventDefault(); router.push('/favorites'); break;
          case 'm': e.preventDefault(); router.push('/map'); break;
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
