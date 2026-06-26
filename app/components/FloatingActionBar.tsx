"use client";

import React, { useState } from "react";
import { useSelection } from "../contexts/SelectionContext";
import styles from "./FloatingActionBar.module.css";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { deletePhotosBulk } from "../actions";

export default function FloatingActionBar() {
  const { isSelectionMode, selectedPhotos, clearSelection } = useSelection();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isSelectionMode || selectedPhotos.length === 0) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      
      const promises = selectedPhotos.map(async (photo, index) => {
        if (!photo.url) return;
        try {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          // Extract extension from URL, fallback to .jpg
          const extMatch = photo.url.match(/\.([a-zA-Z0-9]+)$/);
          const ext = extMatch ? extMatch[1] : "jpg";
          const filename = photo.altText ? `${photo.altText.replace(/[^a-z0-9]/gi, '_')}_${index}.${ext}` : `photo_${index}.${ext}`;
          
          zip.file(filename, blob);
        } catch (e) {
          console.error(`Failed to download photo ${photo.id}`, e);
        }
      });
      
      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "memories_photos.zip");
      clearSelection();
    } catch (e) {
      console.error("Failed to generate ZIP", e);
      alert("Đã xảy ra lỗi khi tải xuống ảnh.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedPhotos.length} ảnh này không? Hành động này không thể hoàn tác.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deletePhotosBulk(selectedPhotos.map(p => p.id));
      clearSelection();
      window.location.reload(); 
    } catch (e) {
      console.error("Failed to delete photos", e);
      alert("Đã xảy ra lỗi khi xóa ảnh.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionContent}>
        <span className={styles.selectedCount}>
          Đã chọn {selectedPhotos.length} ảnh
        </span>
        
        <div className={styles.buttons}>
          <button 
            className={styles.actionBtn} 
            onClick={handleDownload}
            disabled={isDownloading || isDeleting}
          >
            {isDownloading ? (
              <>
                <div className={styles.spinner}></div>
                Đang tải...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Tải xuống
              </>
            )}
          </button>
          
          <button 
            className={`${styles.actionBtn} ${styles.deleteBtn}`} 
            onClick={handleDelete}
            disabled={isDownloading || isDeleting}
          >
            {isDeleting ? "Đang xóa..." : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Xóa
              </>
            )}
          </button>

          <div className={styles.divider}></div>
          
          <button 
            className={`${styles.actionBtn} ${styles.cancelBtn}`} 
            onClick={clearSelection}
            disabled={isDownloading || isDeleting}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
