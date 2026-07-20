"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getUntaggedPhotosInAlbumTree } from "@/app/actions/photo";
import styles from "./page.module.css";

export default function AutoTagFab({ albumId }: { albumId: string }) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState("");
  const router = useRouter();

  const handleScan = async () => {
    try {
      setIsScanning(true);
      setProgress("Đang lấy ds ảnh...");
      
      const untaggedPhotos = await getUntaggedPhotosInAlbumTree(albumId);
      
      if (!untaggedPhotos || untaggedPhotos.length === 0) {
        alert("Tất cả các ảnh trong album (và thư mục con) đã có thẻ!");
        setIsScanning(false);
        setProgress("");
        return;
      }

      let successCount = 0;
      
      for (let i = 0; i < untaggedPhotos.length; i++) {
        const photo = untaggedPhotos[i];
        setProgress(`Đang quét ${i + 1}/${untaggedPhotos.length}...`);
        try {
          const res = await fetch(`/api/v1/photos/${photo.id}/auto-tag`, { method: "POST" });
          if (res.ok) {
            successCount++;
          } else {
            const errData = await res.json().catch(() => null);
            console.error("Auto-tag failed for photo", photo.id, errData || res.statusText);
            if (i === 0) throw new Error(errData?.error || errData?.message || res.statusText);
          }
        } catch (err: any) {
          console.error("Auto-tag exception for photo", photo.id, err);
          if (i === 0) {
            alert(`Lỗi quét ảnh đầu tiên: ${err.message}`);
          }
        }
        // Removed delay because metadata tagging is instant and free!
      }
      
      alert(`Đã tự động gắn thẻ thành công ${successCount}/${untaggedPhotos.length} ảnh trong toàn bộ album.`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi lấy danh sách ảnh.");
    } finally {
      setIsScanning(false);
      setProgress("");
    }
  };

  return (
    <button 
      onClick={handleScan} 
      disabled={isScanning}
      className={`${styles.fabBtn} ${styles.fabAdd}`}
      style={{ 
        background: isScanning ? "var(--bg-secondary)" : "var(--accent-1)",
        color: isScanning ? "var(--text-secondary)" : "white",
        marginBottom: "60px"
      }}
      title="Tự động gắn thẻ ảnh (Metadata)"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
      {isScanning ? progress : "Tự động Gắn thẻ"}
    </button>
  );
}
