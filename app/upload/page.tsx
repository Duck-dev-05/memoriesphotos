"use client";

import { useState } from "react";
import { createAlbum } from "@/app/actions";
import { uploadFileLocalFirst } from "@/app/components/uploadClientStorage";
import { useRouter } from "next/navigation";
import "./upload.css";

export default function UploadPage() {
  const router = useRouter();
  const [newAlbumName, setNewAlbumName] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    setIsCreating(true);
    try {
      let uploadedCoverUrl = "";
      if (coverImage) {
        const videoSizeLimit = 500 * 1024 * 1024;
        if (coverImage.type.startsWith('video/') && coverImage.size > videoSizeLimit) {
          alert(`Video ảnh bìa quá lớn (vượt quá ${videoSizeLimit / (1024 * 1024)}MB). Vui lòng chọn video nhỏ hơn.`);
          setIsCreating(false);
          return;
        }

        uploadedCoverUrl = await uploadFileLocalFirst(coverImage);
      }

      const formData = new FormData();
      formData.append("name", newAlbumName);
      formData.append("description", "");
      if (uploadedCoverUrl) {
        formData.append("coverImageUrl", uploadedCoverUrl);
      }
      const newAlbum = await createAlbum(formData);
      router.push(`/albums/${newAlbum.id}`);
    } catch (err) {
      console.error(err);
      alert("Tạo album thất bại.");
      setIsCreating(false);
    }
  }

  return (
    <main className="uploadPageWrapper">
        <div className="uploadContainer">
          {/* ─── LEFT PANE: Create Album Form ─── */}
          <div className="uploadFormPane">
            <div className="formHeader">
              <h1 className="formTitle">Tạo Album Mới</h1>
              <p className="formSubtitle">
                Nhóm các khoảnh khắc của bạn lại với nhau. Sau khi tạo, bạn có thể tải ảnh trực tiếp vào album này.
              </p>
            </div>

            <form onSubmit={handleCreateAlbum} className="uploadForm">
              <div className="inputGroup">
                <label className="inputLabel">Tên Album</label>
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={e => setNewAlbumName(e.target.value)}
                  className="sleekInput"
                  placeholder="VD: Chuyến đi Đà Lạt mùa hè..."
                  required
                />
              </div>

              <div className="inputGroup">
                <label className="inputLabel">Ảnh bìa (Tùy chọn)</label>
                <div className="fileInputWrapper">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={e => setCoverImage(e.target.files?.[0] || null)}
                    className="sleekFileInput"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="submitBtn"
                disabled={isCreating || !newAlbumName.trim()}
              >
                {isCreating ? <span className="loadingSpinner"></span> : 'Tạo Album'}
              </button>
            </form>
          </div>

        </div>
      </main>
    );
}
