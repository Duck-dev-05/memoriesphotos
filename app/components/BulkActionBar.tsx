"use client";

import { useState } from "react";
import { bulkDeletePhotos, bulkToggleFavorite, bulkAddToAlbum, bulkRemoveFromAlbum } from "@/app/actions";
import { useRouter } from "next/navigation";

interface Album {
  id: string;
  name: string;
}

interface BulkActionBarProps {
  selectedIds: string[];
  albums?: Album[];
  onClear: () => void;
  albumId?: string | null;
}

export default function BulkActionBar({ selectedIds, albums = [], onClear, albumId }: BulkActionBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);

  const count = selectedIds.length;

  async function handleDelete() {
    if (!confirm(`Xóa ${count} ảnh vào thùng rác?`)) return;
    setLoading("delete");
    await bulkDeletePhotos(selectedIds);
    onClear();
    router.refresh();
    setLoading(null);
  }

  async function handleFavorite(isFavorite: boolean) {
    setLoading("favorite");
    await bulkToggleFavorite(selectedIds, isFavorite);
    onClear();
    router.refresh();
    setLoading(null);
  }

  async function handleAddToAlbum(toAlbumId: string) {
    setLoading("album");
    await bulkAddToAlbum(selectedIds, toAlbumId);
    setShowAlbumPicker(false);
    onClear();
    router.refresh();
    setLoading(null);
  }

  async function handleRemoveFromAlbum() {
    if (!albumId) return;
    setLoading("remove");
    await bulkRemoveFromAlbum(selectedIds);
    onClear();
    router.refresh();
    setLoading(null);
  }

  async function handleDownload() {
    setLoading("download");
    try {
      const res = await fetch("/api/download/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memories-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Tải xuống thất bại. Vui lòng thử lại.");
    }
    setLoading(null);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        .bulk-bar {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          background: var(--text-primary);
          color: var(--bg-primary);
          border-radius: 9999px;
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 8px 32px rgba(59,47,47,0.35);
          animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
          white-space: nowrap;
          flex-wrap: nowrap;
        }
        .bulk-count {
          font-family: var(--font-heading);
          font-style: italic;
          font-size: 1rem;
          font-weight: 700;
          padding-right: 0.75rem;
          border-right: 1px solid rgba(255,255,255,0.2);
        }
        .bulk-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          background: transparent;
          color: var(--bg-primary);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 9999px;
          font-family: var(--font-body);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .bulk-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.5); }
        .bulk-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .bulk-btn-danger { color: #ff9b9b; border-color: rgba(255,155,155,0.4); }
        .bulk-btn-danger:hover { background: rgba(255,155,155,0.15); border-color: #ff9b9b; }
        .bulk-clear { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.5); display: flex; padding: 0.25rem; transition: color 0.2s; }
        .bulk-clear:hover { color: white; }
        .album-picker-overlay {
          position: fixed; inset: 0; z-index: 1001;
          background: rgba(59,47,47,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
        }
        .album-picker {
          background: var(--bg-polaroid);
          border: var(--border-delicate);
          box-shadow: 0 20px 60px rgba(59,47,47,0.3);
          border-radius: var(--radius-sm);
          padding: 2rem;
          min-width: 300px;
          max-height: 400px;
          overflow-y: auto;
          animation: slideUp 0.25s ease;
        }
        .album-picker-title {
          font-family: var(--font-heading);
          font-style: italic;
          font-size: 1.2rem;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        .album-option {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.75rem 1rem;
          background: transparent;
          border: var(--border-delicate);
          border-radius: var(--radius-sm);
          margin-bottom: 0.5rem;
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: background 0.2s;
        }
        .album-option:hover { background: var(--bg-secondary); }
      `}} />

      <div className="bulk-bar" role="toolbar" aria-label="Bulk actions">
        <span className="bulk-count">{count} ảnh đã chọn</span>

        {/* Download */}
        <button className="bulk-btn" onClick={handleDownload} disabled={!!loading} title="Tải xuống ZIP">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {loading === "download" ? "Đang tải..." : "Tải xuống"}
        </button>

        {/* Favorite */}
        <button className="bulk-btn" onClick={() => handleFavorite(true)} disabled={!!loading} title="Yêu thích">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Yêu thích
        </button>

        {/* Add to album */}
        {albums.length > 0 && (
          <button className="bulk-btn" onClick={() => setShowAlbumPicker(true)} disabled={!!loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Thêm vào Album
          </button>
        )}

        {/* Remove from album */}
        {albumId && (
          <button className="bulk-btn" onClick={handleRemoveFromAlbum} disabled={!!loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            {loading === "remove" ? "Đang xử lý..." : "Xóa khỏi Album"}
          </button>
        )}

        {/* Delete */}
        <button className="bulk-btn bulk-btn-danger" onClick={handleDelete} disabled={!!loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          {loading === "delete" ? "Đang xóa..." : "Xóa"}
        </button>

        {/* Clear selection */}
        <button className="bulk-clear" onClick={onClear} title="Bỏ chọn tất cả" aria-label="Clear selection">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Album picker modal */}
      {showAlbumPicker && (
        <div className="album-picker-overlay" onClick={() => setShowAlbumPicker(false)}>
          <div className="album-picker" onClick={e => e.stopPropagation()}>
            <div className="album-picker-title">Chọn Album</div>
            {albums.map(album => (
              <button key={album.id} className="album-option" onClick={() => handleAddToAlbum(album.id)}>
                📁 {album.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
