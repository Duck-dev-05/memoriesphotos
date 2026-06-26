"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "./page.module.css";
import { scanAlbumSmartObjects } from "@/app/actions";
import { useSelection } from "@/app/contexts/SelectionContext";
import SelectablePhoto from "@/app/components/SelectablePhoto";

interface Album { id: string; name: string; }

export default function SmartFilterGrid({
  photos,
  albumId,
  isAuth,
  albums = [],
}: {
  photos: any[];
  albumId?: string;
  isAuth: boolean;
  albums?: Album[];
}) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isScanning, setIsScanning] = useState(false);
  const { isSelectionMode, toggleSelectionMode, isSelected, togglePhoto, selectedPhotos } = useSelection();

  const handleScan = async () => {
    if (!albumId) return;
    try {
      setIsScanning(true);
      await scanAlbumSmartObjects(albumId);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi quét AI");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectAll = () => {
    // Only select photos visible in current filter
    const visiblePhotos = filteredPhotos;
    const allCurrentlySelected = visiblePhotos.every((p: any) => isSelected(p.id));
    
    if (allCurrentlySelected) {
      // Deselect all visible
      visiblePhotos.forEach((p: any) => {
        if (isSelected(p.id)) togglePhoto(p);
      });
    } else {
      // Select all visible
      visiblePhotos.forEach((p: any) => {
        if (!isSelected(p.id)) togglePhoto(p);
      });
    }
  };

  // Aggregate tags for filtering
  const tagsSet = new Set<string>();
  photos.forEach((photo) => {
    if (photo.tags) {
      photo.tags.forEach((tag: any) => tagsSet.add(tag.name));
    }
  });

  const availableTags = Array.from(tagsSet).sort((a, b) => {
    if (a === "person") return -1;
    if (b === "person") return 1;
    return a.localeCompare(b);
  });

  const filteredPhotos =
    activeFilter === "all"
      ? photos
      : photos.filter((photo) =>
          photo.tags?.some((t: any) => t.name === activeFilter)
        );

  const allSelected = filteredPhotos.length > 0 && filteredPhotos.every((p: any) => isSelected(p.id));

  return (
    <>
      {/* ── Toolbar ─────────────────────────── */}
      {isAuth && (
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Tag filters */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: 1 }}>
            <button
              onClick={() => setActiveFilter("all")}
              className={styles.filterBtn}
              style={activeFilter === "all" ? { background: "var(--text-primary)", color: "var(--bg-primary)", borderColor: "var(--text-primary)" } : {}}
            >
              Tất cả
            </button>
            {availableTags.slice(0, 8).map(tag => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={styles.filterBtn}
                style={activeFilter === tag ? { background: "var(--accent-1)", color: "white", borderColor: "var(--accent-1)" } : {}}
              >
                {tag === "person" ? "👤 Người" : `#${tag}`}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {isSelectionMode && filteredPhotos.length > 0 && (
              <button
                onClick={handleSelectAll}
                className={styles.filterBtn}
                style={{ fontSize: "0.8rem" }}
              >
                {allSelected ? "Bỏ chọn tất cả" : `Chọn tất cả (${filteredPhotos.length})`}
              </button>
            )}

            <button
              onClick={toggleSelectionMode}
              className={styles.filterBtn}
              style={isSelectionMode
                ? { background: "var(--text-primary)", color: "var(--bg-primary)", borderColor: "var(--text-primary)" }
                : {}}
            >
              {isSelectionMode ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: "4px" }}>
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Hủy chọn
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: "4px" }}>
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Chọn nhiều
                </>
              )}
            </button>

            {albumId && (
              <button
                onClick={handleScan}
                disabled={isScanning || isSelectionMode}
                className={styles.filterBtn}
                style={{ borderStyle: "dashed", color: "var(--accent-1)", borderColor: "var(--accent-1)" }}
              >
                {isScanning ? "Đang quét AI..." : "✨ Quét AI"}
              </button>
            )}
          </div>
        </div>
      )}

      {filteredPhotos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
          Không có ảnh nào chứa đối tượng này.
        </div>
      ) : (
        <div className={styles.masonryGallery}>
          {filteredPhotos.map((photo: any, idx: number) => {
            const selected = isSelected(photo.id);
            return (
              <SelectablePhoto key={photo.id} photo={photo} className={styles.photoTile} style={{ animationDelay: `${idx * 0.035}s` }}>
                <div className={styles.photoTileInner}>
                  <div className={styles.photoTilePlaceholder}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>

                  {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                    <video src={getOptimizedMediaUrl(photo.url)} className={styles.photoTileImg} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                  ) : (
                    <Image
                      src={photo.imageData || photo.url || ""}
                      alt={photo.altText || "Ảnh"}
                      fill
                      priority={idx < 8}
                      className={styles.photoTileImg}
                      sizes="(max-width: 480px) 50vw, (max-width: 800px) 33vw, (max-width: 1200px) 25vw, 320px"
                    />
                  )}

                  {photo.tags && photo.tags.length > 0 && (
                    <div className={styles.photoSmartTags}>
                      {photo.tags.slice(0, 2).map((t: any) => (
                        <span key={t.id} className={styles.smallTagBadge}>
                          {t.name === "person" ? "👤" : `#${t.name}`}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={styles.photoTileOverlay} />
                </div>
              </SelectablePhoto>
            );
          })}
        </div>
      )}
    </>
  );
}
