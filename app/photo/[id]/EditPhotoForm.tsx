"use client";

import React, { useState } from "react";
import { updatePhoto } from "@/app/actions";

interface EditPhotoFormProps {
  photo: {
    id: string;
    altText: string;
    description: string | null;
    albumId: string | null;
    tags: string;
  };
  albums: { id: string; name: string }[];
}

export default function EditPhotoForm({ photo, albums }: EditPhotoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function actionWrapper(formData: FormData) {
    setIsSubmitting(true);
    try {
      await updatePhoto(photo.id, formData);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("Failed to update photo");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "2.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          {photo.altText}
        </h1>
        {photo.description && (
          <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem", lineHeight: 1.6, marginBottom: "2rem", maxWidth: "600px", margin: "0 auto 2rem", whiteSpace: "pre-wrap" }}>
            {photo.description}
          </p>
        )}
        <button 
          onClick={() => setIsEditing(true)} 
          className="btn btn-secondary" 
          style={{ marginBottom: "2rem", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
        >
          Sửa thông tin ảnh
        </button>
      </div>
    );
  }

  return (
    <form action={actionWrapper} style={{ width: "100%", maxWidth: "500px", margin: "0 auto 2rem", textAlign: "left" }}>
      <div className="form-group">
        <label htmlFor="altText" className="form-label">Tên ảnh</label>
        <input 
          type="text" 
          id="altText" 
          name="altText" 
          defaultValue={photo.altText} 
          className="form-input" 
          required 
        />
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">Mô tả câu chuyện</label>
        <textarea 
          id="description" 
          name="description" 
          defaultValue={photo.description || ""} 
          className="form-input" 
          rows={3} 
        />
      </div>

      <div className="form-group">
        <label htmlFor="tags" className="form-label">Thẻ (cách nhau bằng dấu phẩy)</label>
        <input 
          type="text" 
          id="tags" 
          name="tags" 
          defaultValue={photo.tags} 
          className="form-input" 
          placeholder="ví dụ: sinh nhật, gia đình, bạn bè"
        />
      </div>

      <div className="form-group">
        <label htmlFor="albumId" className="form-label">Chuyển Album</label>
        <select 
          id="albumId" 
          name="albumId" 
          defaultValue={photo.albumId || ""} 
          className="form-input"
        >
          <option value="">(Không có album)</option>
          {albums.map((a) => (
            <React.Fragment key={a.id}>
              <option value={a.id}>{a.name}</option>
              {/* @ts-ignore */}
              {a.children?.map(c => (
                <option key={c.id} value={c.id}>— {c.name}</option>
              ))}
            </React.Fragment>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button 
          type="button" 
          onClick={() => setIsEditing(false)} 
          className="btn btn-secondary" 
          disabled={isSubmitting}
        >
          Hủy
        </button>
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang lưu..." : "Lưu Thay Đổi"}
        </button>
      </div>
    </form>
  );
}
