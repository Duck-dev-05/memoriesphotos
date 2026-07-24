"use client";

import React, { useState } from "react";
import styles from "./BatchEditModal.module.css";
import { updatePhotosBulk } from "../actions/photo";

interface BatchEditModalProps {
  photoIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchEditModal({ photoIds, isOpen, onClose, onSuccess }: BatchEditModalProps) {
  const [altText, setAltText] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photoIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await updatePhotosBulk(photoIds, { altText, description, tags });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Batch update failed", err);
      alert("Đã xảy ra lỗi khi cập nhật thông tin hàng loạt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Chỉnh sửa thông tin hàng loạt</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <p className={styles.subtitle}>Đang chọn {photoIds.length} ảnh. Nhập các thuộc tính muốn áp dụng chung:</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tiêu đề mới (Alt Text)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Để trống nếu không muốn thay đổi"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Mô tả chung</label>
            <textarea
              className={styles.textarea}
              placeholder="Để trống nếu không muốn thay đổi"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Thẻ / Tags (cách nhau bởi dấu phẩy)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ví dụ: Du lịch, Đà Lạt, 2026"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu tất cả"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
