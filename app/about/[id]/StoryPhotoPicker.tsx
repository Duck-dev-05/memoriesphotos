"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { setStoryPhotos } from "@/app/actions/story";
import { getOptimizedMediaUrl } from "@/lib/media";

interface Photo {
  id: string;
  url: string | null;
  altText: string | null;
}

interface StoryPhotoPickerProps {
  storyId: string;
  allPhotos: Photo[];
  currentPhotoIds: string[];
}

export default function StoryPhotoPicker({ storyId, allPhotos, currentPhotoIds }: StoryPhotoPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(currentPhotoIds);
  const [isPending, startTransition] = useTransition();

  const togglePhoto = (id: string) => {
    setSelectedPhotos(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await setStoryPhotos(storyId, selectedPhotos);
        setIsOpen(false);
      } catch (err: any) {
        alert("Lỗi: " + err.message);
      }
    });
  };

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "3rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
        <button 
          onClick={() => {
            setSelectedPhotos(currentPhotoIds);
            setIsOpen(true);
          }}
          style={{
            background: "none", border: "1px dashed var(--accent-1)", color: "var(--accent-1)",
            padding: "0.8rem 2rem", borderRadius: "8px", fontSize: "1rem", cursor: "pointer",
            fontFamily: "var(--font-heading)"
          }}
        >
          {currentPhotoIds.length > 0 ? "Chỉnh sửa bộ ảnh" : "+ Thêm ảnh từ Thư Viện"}
        </button>

        <label 
          htmlFor="album-upload-input"
          style={{
            background: "var(--accent-1)", border: "1px solid var(--accent-1)", color: "white",
            padding: "0.8rem 2rem", borderRadius: "8px", fontSize: "1rem", cursor: "pointer",
            fontFamily: "var(--font-heading)", display: "inline-block", margin: 0
          }}
        >
          + Tải lên từ máy
        </label>
      </div>

      {isOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(59,47,47,0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem"
        }}>
          <div style={{
            background: "var(--bg-polaroid)", borderRadius: "16px", padding: "2rem",
            width: "100%", maxWidth: "900px", maxHeight: "90vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", margin: 0 }}>
                Chọn ảnh ({selectedPhotos.length} đã chọn)
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", paddingRight: "10px" }}>
              {allPhotos.map(photo => {
                const isSelected = selectedPhotos.includes(photo.id);
                return (
                  <div 
                    key={photo.id} 
                    onClick={() => togglePhoto(photo.id)}
                    style={{ 
                      position: "relative", aspectRatio: "1/1", cursor: "pointer", 
                      borderRadius: "8px", overflow: "hidden",
                      border: isSelected ? "4px solid var(--accent-1)" : "2px solid transparent",
                      opacity: isSelected ? 1 : 0.7,
                      transition: "all 0.2s"
                    }}
                  >
                    {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video src={getOptimizedMediaUrl(photo.url)} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    ) : (
                      <Image src={photo.url || ''} alt={photo.altText || ''} fill style={{ objectFit: 'cover' }} sizes="150px" />
                    )}
                    {isSelected && (
                      <div style={{ position: "absolute", top: "5px", right: "5px", background: "var(--accent-1)", color: "white", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
              {allPhotos.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                  Bạn chưa có ảnh nào. Hãy tải ảnh lên trước nhé!
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-delicate)" }}>
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                style={{ padding: "0.8rem 1.5rem", borderRadius: "8px", border: "1px solid var(--border-delicate)", background: "transparent", cursor: "pointer" }}
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                disabled={isPending}
                style={{ padding: "0.8rem 1.5rem", borderRadius: "8px", border: "none", background: "var(--accent-1)", color: "white", cursor: "pointer" }}
              >
                {isPending ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
