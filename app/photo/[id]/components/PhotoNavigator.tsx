"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PhotoNavigator({
  children,
  prevId,
  nextId,
  albumId
}: {
  children: React.ReactNode;
  prevId: string | null;
  nextId: string | null;
  albumId: string | null;
}) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft" && prevId) {
        // Left arrow -> newer photo
        router.push(`/photo/${prevId}`);
      } else if (e.key === "ArrowRight" && nextId) {
        // Right arrow -> older photo
        router.push(`/photo/${nextId}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextId, prevId, router]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].screenX;
    
    const swipeDistance = touchStartX.current - touchEndX;
    const minSwipeDistance = 50;

    if (swipeDistance > minSwipeDistance && nextId) {
      // Swiped left -> older photo (nextId)
      router.push(`/photo/${nextId}`);
    } else if (swipeDistance < -minSwipeDistance && prevId) {
      // Swiped right -> newer photo (prevId)
      router.push(`/photo/${prevId}`);
    }
    touchStartX.current = null;
  };

  return (
    <div 
      style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {prevId && (
        <Link 
          href={`/photo/${prevId}`} 
          style={{ 
            position: "absolute", left: "2rem", top: "50%", transform: "translateY(-50%)",
            color: "white", opacity: 0.5, transition: "all 0.2s",
            zIndex: 10, padding: "1rem", display: "none" // We use media query later or just show on desktop
          }}
          className="desktop-nav-arrow"
          title="Ảnh mới hơn (Phím ←)"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
      )}

      {children}

      {nextId && (
        <Link 
          href={`/photo/${nextId}`} 
          style={{ 
            position: "absolute", right: "2rem", top: "50%", transform: "translateY(-50%)",
            color: "white", opacity: 0.5, transition: "all 0.2s",
            zIndex: 10, padding: "1rem", display: "none"
          }}
          className="desktop-nav-arrow"
          title="Ảnh cũ hơn (Phím →)"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 1100px) {
          .desktop-nav-arrow {
            display: block !important;
          }
          .desktop-nav-arrow:hover {
            opacity: 1 !important;
            color: white !important;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
          }
        }
      `}} />
    </div>
  );
}
