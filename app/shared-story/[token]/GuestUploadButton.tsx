"use client";
import React, { useState } from "react";
import { saveGuestUploadedStoryPhotoRecord } from "@/app/actions/story";
import { uploadFileLocalFirst } from "@/app/components/uploadClientStorage";
import styles from "../../albums/[id]/page.module.css";
import { useRouter } from "next/navigation";

export default function GuestUploadButton({ token, isLoggedIn }: { token: string, isLoggedIn: boolean }) {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (!isLoggedIn) {
      e.preventDefault();
      alert("Vui lòng đăng nhập để đóng góp ảnh cho câu chuyện này.");
      router.push(`/login`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // 1. Extract EXIF data (minimal)
      const exifDetails: { dateTaken?: Date | null } = {};
      const isVideo = file.type.startsWith('video/') || ["mp4", "mov", "avi", "webm", "mkv"].includes(file.name.split('.').pop()?.toLowerCase() || '');
      
      if (!isVideo) {
        try {
          const exifr = (await import('exifr')).default;
          const exifData = await exifr.parse(file, { tiff: true, exif: true, reviveValues: true });
          if (exifData) {
            exifDetails.dateTaken = exifData.DateTimeOriginal ? new Date(exifData.DateTimeOriginal) : (exifData.CreateDate ? new Date(exifData.CreateDate) : null);
          }
        } catch {}
      }

      // 2. Save locally first, then cloud upload continues in the background.
      const uploadUrl = await uploadFileLocalFirst(file, { shareToken: token });

      // 3. Save record
      await saveGuestUploadedStoryPhotoRecord(token, {
        url: uploadUrl,
        altText: file.name,
        exifData: exifDetails
      });
      alert("Tải lên thành công!");
    } catch (error: unknown) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Có lỗi xảy ra khi tải lên.");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  return (
    <div className={styles.fab}>
      <label 
        htmlFor="guest-upload-input" 
        className={`${styles.fabBtn} ${styles.fabAdd}`} 
        style={{ opacity: isUploading ? 0.7 : 1, cursor: isUploading ? "not-allowed" : "pointer" }}
        onClick={handleLabelClick}
      >
        {isUploading ? (
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            Đang tải...
          </span>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Đóng góp Ảnh
          </>
        )}
      </label>
      <input
        type="file"
        id="guest-upload-input"
        accept="image/*,video/mp4,video/quicktime"
        style={{ display: "none" }}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
