"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";

export default function LightboxClient({ photo, contextPhotos = [], isAuth = false }: { photo: any, contextPhotos?: any[], isAuth?: boolean }) {
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);
  const [isFavorite, setIsFavorite] = useState(photo.isFavorite);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const contextPhotosRef = useRef(contextPhotos);
  const photoIdRef = useRef(photo.id);

  // Swipe handling
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null); // otherwise the swipe is fired even with usual touch events
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleSwipeEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      const photos = contextPhotosRef.current;
      if (!photos || photos.length <= 1) return;
      const currentId = photoIdRef.current;
      const currentIndex = photos.findIndex(p => p.id === currentId);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      if (isLeftSwipe) { // swipe left -> next photo
        newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
      } else if (isRightSwipe) { // swipe right -> previous photo
        newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
      }
      router.replace(`/photo/${photos[newIndex].id}`);
    }
  };

  useEffect(() => {
    contextPhotosRef.current = contextPhotos;
    photoIdRef.current = photo.id;
    setIsFavorite(photo.isFavorite);
  }, [contextPhotos, photo.id, photo.isFavorite]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite); // Optimistic UI update
    try {
      const { toggleFavorite } = await import("@/app/actions");
      await toggleFavorite(photo.id, !isFavorite);
    } catch (err) {
      console.error(err);
      setIsFavorite(isFavorite); // Revert on error
    }
  };

  const isSelected = selectedIds.includes(photo.id);
  const handleToggleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(photo.id) ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
    );
  };

  const handleBulkDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.length > 50) {
      alert("Chỉ được tải tối đa 50 ảnh cùng lúc.");
      return;
    }
    const ids = selectedIds.join(",");
    window.location.href = `/api/download?ids=${ids}`;
    setTimeout(() => setSelectedIds([]), 1500);
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const photos = contextPhotosRef.current;
      const currentId = photoIdRef.current;
      
      if (e.key === "Escape") {
        router.back();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (!photos || photos.length <= 1) return;
        
        const currentIndex = photos.findIndex(p => p.id === currentId);
        if (currentIndex === -1) return;
        
        let newIndex = currentIndex;
        if (e.key === "ArrowRight") {
          newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
        } else if (e.key === "ArrowLeft") {
          newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
        }
        
        const nextPhoto = photos[newIndex];
        if (nextPhoto && nextPhoto.id !== currentId) {
          // Use router.replace so we don't build up a massive browser history
          router.replace(`/photo/${nextPhoto.id}`);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#050505",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem",
        transition: "all 0.4s ease",
        overflow: "hidden"
      }}
      onClick={() => router.back()}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={handleSwipeEnd}
    >
      {/* AMBIENT BACKGROUND GLOW */}
      {photo.url && !photo.url.match(/\.(mp4|webm|ogg|mov)$/i) && (
        <div style={{ position: "absolute", inset: "-10%", zIndex: 0, opacity: 0.6, pointerEvents: "none" }}>
          <Image
            src={photo.url}
            alt=""
            fill
            style={{ objectFit: "cover", filter: "blur(100px) saturate(200%)" }}
            sizes="100vw"
            quality={1}
          />
        </div>
      )}
      
      {/* BACKGROUND DIMMER */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)", zIndex: 1, pointerEvents: "none" }} />

      {/* TOP RIGHT CONTROLS */}
      <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem", display: "flex", gap: "1rem", zIndex: 1010 }}>
        {isAuth && (
          <button 
            onClick={handleToggleFavorite}
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: isFavorite ? "var(--accent-1)" : "rgba(255,255,255,0.8)",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "scale(1)"; }}
            title={isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        )}

        <button 
          onClick={handleToggleSelect}
          style={{
            background: isSelected ? "var(--accent-1)" : "rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: isSelected ? "white" : "rgba(255,255,255,0.8)",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)",
            boxShadow: isSelected ? "0 4px 16px rgba(201,122,126,0.4)" : "0 4px 12px rgba(0,0,0,0.2)"
          }}
          onMouseEnter={(e) => { if(!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "scale(1.05)"; } }}
          onMouseLeave={(e) => { if(!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "scale(1)"; } }}
          title={isSelected ? "Bỏ chọn" : "Chọn ảnh này"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>

        {isAuth && (
          <a
            href={`/photo/${photo.id}/edit`}
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.8)",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              textDecoration: "none"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "scale(1)"; }}
            title="Chỉnh sửa ảnh"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </a>
        )}

        <a
          href={photo.url}
          download={photo.altText || "photo"}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.8)",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "scale(1)"; }}
          title="Tải xuống"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>

        <button 
          onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
          style={{
            background: showInfo ? "var(--accent-1)" : "rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: showInfo ? "white" : "rgba(255,255,255,0.8)",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)",
            boxShadow: showInfo ? "0 8px 24px rgba(201, 122, 126, 0.4)" : "0 4px 12px rgba(0,0,0,0.2)"
          }}
          onMouseEnter={(e) => { if(!showInfo) { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "scale(1.05)"; } }}
          onMouseLeave={(e) => { if(!showInfo) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "scale(1)"; } }}
          title="Information"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>

        <button 
          onClick={() => router.back()}
          style={{ 
            background: "rgba(255,255,255,0.05)", 
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.8)", 
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "scale(1)"; }}
          title="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div 
        style={{ 
          position: "relative", 
          width: "100%", 
          height: "100%", 
          maxWidth: "1400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: showInfo ? "translateX(-180px)" : "translateX(0)",
          zIndex: 10
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* IMAGE / VIDEO */}
        <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
            <video
              src={getOptimizedMediaUrl(photo.url)}
              controls
              autoPlay
              style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", outline: "none", borderRadius: "8px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
            />
          ) : (
            <Image
              src={photo.url}
              alt={photo.altText}
              fill
              style={{ objectFit: "contain", filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.6))" }}
            />
          )}
        </div>

        {/* FLOATING TITLE PILL */}
        <div style={{ 
          position: "absolute", 
          bottom: "-1.5rem", 
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "0.8rem 2rem",
          borderRadius: "40px",
          textAlign: "center", 
          color: "white", 
          fontFamily: "var(--font-heading)", 
          fontStyle: "italic", 
          fontSize: "1.2rem",
          fontWeight: 600,
          letterSpacing: "0.5px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          zIndex: 10
        }}>
          {photo.altText}
        </div>
      </div>

      {/* FLOATING BULK DOWNLOAD BUTTON */}
      {selectedIds.length > 0 && (
        <div style={{
          position: "absolute",
          bottom: "7rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1020,
          animation: "slideUp 0.3s ease-out"
        }}>
          <button 
            onClick={handleBulkDownload}
            style={{
              background: "var(--accent-1)",
              color: "white",
              border: "none",
              padding: "0.8rem 1.5rem",
              borderRadius: "30px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(201,122,126,0.5)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "transform 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Tải xuống {selectedIds.length} ảnh đã chọn
          </button>
        </div>
      )}

      {/* FILMSTRIP (THUMBNAILS) */}
      {contextPhotos.length > 1 && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: showInfo ? "translate(-50%, 150%)" : "translate(-50%, 0)",
            background: "rgba(20, 15, 15, 0.65)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "0.8rem 1rem",
            borderRadius: "100px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)"
          }}
        >
          <div style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            maxWidth: "calc(100vw - 4rem)",
            scrollbarWidth: "none", // Hide scrollbar for Firefox
            msOverflowStyle: "none", // Hide scrollbar for IE
          }}>
            <style>{`
              /* Hide scrollbar for Chrome/Safari */
              .filmstrip-scroll::-webkit-scrollbar { display: none; }
            `}</style>
            <div className="filmstrip-scroll" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {contextPhotos.map((p: any) => {
                const isActive = p.id === photo.id;
                return (
                  <Link 
                    key={p.id} 
                    href={`/photo/${p.id}`}
                    replace // use replace so we don't build huge browser history
                    style={{
                      position: "relative",
                      width: isActive ? "54px" : "44px",
                      height: isActive ? "54px" : "44px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      opacity: isActive ? 1 : 0.6,
                      border: isActive ? "2px solid white" : (selectedIds.includes(p.id) ? "2px solid var(--accent-1)" : "2px solid transparent"),
                      transition: "all 0.3s cubic-bezier(0.34, 1.3, 0.64, 1)",
                      cursor: "pointer",
                      boxShadow: isActive ? "0 4px 16px rgba(0,0,0,0.6)" : "none"
                    }}
                    onMouseEnter={(e) => { if(!isActive) { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "scale(1.1)"; } }}
                    onMouseLeave={(e) => { if(!isActive) { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.transform = "scale(1)"; } }}
                  >
                    {p.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video src={getOptimizedMediaUrl(p.url)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Image src={p.url} alt={p.altText || ""} fill style={{ objectFit: "cover" }} sizes="60px" />
                    )}
                    {selectedIds.includes(p.id) && (
                      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(201,122,126,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* INFO SIDEBAR */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "400px",
          background: "rgba(20, 15, 15, 0.75)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          padding: "3rem 2.5rem",
          color: "white",
          transform: showInfo ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          overflowY: "auto",
          zIndex: 1001,
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)"
        }}
      >
        <h2 style={{ 
          fontFamily: "var(--font-heading)", 
          fontSize: "1.8rem", 
          marginBottom: "2.5rem", 
          borderBottom: "1px solid rgba(255,255,255,0.1)", 
          paddingBottom: "1.5rem",
          fontWeight: 600,
          letterSpacing: "-0.5px"
        }}>
          Thông tin chi tiết
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Details */}
          {photo.description && (
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" }}>
                {photo.description}
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Date Taken */}
            <div style={{ display: "flex", gap: "1.2rem", alignItems: "flex-start" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "0.8rem", borderRadius: "50%", color: "var(--accent-1)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div style={{ marginTop: "0.2rem" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 600 }}>Ngày chụp</div>
                <div style={{ fontSize: "1rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  {photo.dateTaken ? new Date(photo.dateTaken).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' }) : "Không có dữ liệu"}
                </div>
              </div>
            </div>

            {/* Device */}
            <div style={{ display: "flex", gap: "1.2rem", alignItems: "flex-start" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "0.8rem", borderRadius: "50%", color: "var(--accent-1)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <div style={{ marginTop: "0.2rem" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 600 }}>Thiết bị</div>
                <div style={{ fontSize: "1.05rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  {photo.cameraMake || photo.cameraModel 
                    ? (() => {
                        const make = photo.cameraMake || '';
                        const model = photo.cameraModel || '';
                        // Remove duplicate Make in Model (e.g., "Canon Canon PowerShot")
                        const cleanModel = model.toLowerCase().startsWith(make.toLowerCase()) 
                          ? model.substring(make.length).trim() 
                          : model;
                        return `${make} ${cleanModel}`.trim();
                      })()
                    : "Không có dữ liệu"}
                </div>
                {photo.lensModel && (
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                    {photo.lensModel}
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Date & Album Info */}
            <div style={{ display: "flex", gap: "1.2rem", alignItems: "flex-start" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "0.8rem", borderRadius: "50%", color: "var(--accent-1)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <div style={{ marginTop: "0.2rem" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 600 }}>Tải lên</div>
                <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 500 }}>
                  {new Date(photo.createdAt).toLocaleString('vi-VN')}
                </div>
                {photo.album && (
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    {photo.album.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* EXIF Settings Grid */}
          {(photo.fNumber || photo.exposureTime || photo.iso || photo.focalLength) && (
            <div style={{ 
              background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)", 
              borderRadius: "16px", 
              padding: "1.5rem", 
              marginTop: "1rem",
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1)"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                {photo.fNumber && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Khẩu độ</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "white" }}>f/{photo.fNumber}</div>
                  </div>
                )}
                {photo.exposureTime && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Tốc độ chớp</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "white" }}>{photo.exposureTime}s</div>
                  </div>
                )}
                {photo.iso && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>ISO</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "white" }}>{photo.iso}</div>
                  </div>
                )}
                {photo.focalLength && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>Tiêu cự</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "white" }}>{photo.focalLength}mm</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
