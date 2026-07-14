"use client";

import { useState } from "react";
import { updateAlbum } from "@/app/actions";
import styles from "./page.module.css";

export default function EditAlbumModal({ album }: { album: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description || "");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      if (coverImage) {
        formData.append("coverImage", coverImage);
      }
      await updateAlbum(album.id, formData);
      setIsOpen(false);
      setCoverImage(null);
    } catch (err) {
      console.error(err);
      alert("Cập nhật album thất bại");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className={`${styles.fabBtn} ${styles.fabEdit}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Sửa Album
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Chỉnh sửa Album</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Tên Album</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mô tả</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows={3}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Ảnh bìa (không bắt buộc)</label>
                <input 
                  type="file" 
                  accept="image/*,video/*"
                  onChange={e => setCoverImage(e.target.files?.[0] || null)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  style={{ padding: '0.8rem 1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving || !name.trim()}
                  style={{ padding: '0.8rem 1.5rem', background: 'var(--accent-1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
