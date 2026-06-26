"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Whenever the route changes, navigation is complete
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target || !target.href) return;
      
      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(target.href);
        
        // Ignore external links, new tabs, or anchor links on the same page
        if (
          target.target === "_blank" ||
          e.ctrlKey || e.metaKey || e.shiftKey || e.altKey ||
          targetUrl.origin !== currentUrl.origin ||
          (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search)
        ) {
          return;
        }

        // Show loading bar instantly
        setIsLoading(true);
      } catch (err) {
        // Ignore invalid URLs
      }
    };

    // Use capturing phase to ensure we intercept it before Next.js Link
    document.addEventListener("click", handleAnchorClick, true);
    
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "3px",
      zIndex: 999999,
      pointerEvents: "none"
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
        background: "var(--accent-1, #c97a7e)",
        animation: "nprogress-pulse 10s cubic-bezier(0.1, 0.7, 0.1, 1) forwards",
        transformOrigin: "0% 50%",
        boxShadow: "0 0 10px var(--accent-1, #c97a7e), 0 0 5px var(--accent-1, #c97a7e)",
        width: "100%"
      }}></div>
      <style>{`
        @keyframes nprogress-pulse {
          0% { transform: scaleX(0); opacity: 1; }
          10% { transform: scaleX(0.3); opacity: 1; }
          30% { transform: scaleX(0.5); opacity: 1; }
          60% { transform: scaleX(0.7); opacity: 1; }
          100% { transform: scaleX(0.9); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
