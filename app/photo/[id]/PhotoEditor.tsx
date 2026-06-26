"use client";

import React, { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { saveEditedPhoto } from "@/app/actions";
import { useRouter } from "next/navigation";

interface PhotoEditorProps {
  photoId: string;
  imageUrl: string;
  onClose: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: any,
  rotation = 0,
  filters = { brightness: 100, contrast: 100, sepia: 0, grayscale: 0 }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  // calculate bounding box of the rotated image
  // For rotation, the bounding box might grow. We simplify here by just using image dimensions if rotation is multiples of 90.
  // Actually, a robust bounding box calculation:
  const rotRad = getRadianAngle(rotation);
  const width = Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
  const height = Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

  canvas.width = width;
  canvas.height = height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Apply filters
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`;

  ctx.drawImage(image, 0, 0);

  // cropped area
  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) return null;

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    croppedCanvas.toBlob((blob) => {
      resolve(blob);
    }, "image/jpeg", 0.95);
  });
}

export default function PhotoEditor({ photoId, imageUrl, onClose }: PhotoEditorProps) {
  const router = useRouter();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    sepia: 0,
    grayscale: 0,
  });

  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setSaving(true);
      const croppedImageBlob = await getCroppedImg(imageUrl, croppedAreaPixels, rotation, filters);
      if (!croppedImageBlob) throw new Error("Failed to crop image");

      const formData = new FormData();
      formData.append("file", croppedImageBlob, "edited.jpg");

      await saveEditedPhoto(photoId, formData);
      router.refresh();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Đã xảy ra lỗi khi lưu ảnh.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.95)", zIndex: 9999,
      display: "flex", flexDirection: "column"
    }}>
      <div style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <h2 style={{ color: "white", margin: 0, fontFamily: "var(--font-heading)" }}>🎨 Trình Chỉnh Sửa Ảnh</h2>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={onClose} className="btn" style={{ borderColor: "rgba(255,255,255,0.5)", color: "white" }}>Hủy</button>
          <button onClick={handleSave} className="btn" style={{ background: "var(--accent-1)", color: "white", borderColor: "var(--accent-1)" }} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Editor Area */}
        <div style={{ flex: 1, position: "relative", backgroundColor: "#111" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`
          }}>
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={undefined} // Free crop
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
            />
          </div>
        </div>

        {/* Sidebar Controls */}
        <div style={{ width: "320px", backgroundColor: "#1a1a1a", padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2rem", color: "white" }}>
          
          <div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", marginBottom: "1rem", color: "var(--accent-1)" }}>Kích thước & Góc</h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span>Thu phóng (Zoom)</span>
                <span>{zoom.toFixed(1)}x</span>
              </label>
              <input 
                type="range" min={1} max={3} step={0.1} value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))} 
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
              />
            </div>

            <div>
              <label style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span>Xoay (Rotate)</span>
                <span>{rotation}°</span>
              </label>
              <input 
                type="range" min={-180} max={180} step={1} value={rotation} 
                onChange={(e) => setRotation(Number(e.target.value))} 
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button onClick={() => setRotation(r => r - 90)} style={{ flex: 1, padding: "0.5rem", background: "#333", border: "none", color: "white", borderRadius: "8px", cursor: "pointer" }}>↺ Xoay trái</button>
              <button onClick={() => setRotation(r => r + 90)} style={{ flex: 1, padding: "0.5rem", background: "#333", border: "none", color: "white", borderRadius: "8px", cursor: "pointer" }}>Xoay phải ↻</button>
            </div>
          </div>

          <div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", marginBottom: "1rem", color: "var(--accent-1)" }}>Màu sắc (Filters)</h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span>Độ sáng</span>
                <span>{filters.brightness}%</span>
              </label>
              <input 
                type="range" min={0} max={200} value={filters.brightness} 
                onChange={(e) => setFilters(f => ({ ...f, brightness: Number(e.target.value) }))} 
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span>Độ tương phản</span>
                <span>{filters.contrast}%</span>
              </label>
              <input 
                type="range" min={0} max={200} value={filters.contrast} 
                onChange={(e) => setFilters(f => ({ ...f, contrast: Number(e.target.value) }))} 
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span>Hoài cổ (Sepia)</span>
                <span>{filters.sepia}%</span>
              </label>
              <input 
                type="range" min={0} max={100} value={filters.sepia} 
                onChange={(e) => setFilters(f => ({ ...f, sepia: Number(e.target.value) }))} 
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                <span>Trắng đen (Grayscale)</span>
                <span>{filters.grayscale}%</span>
              </label>
              <input 
                type="range" min={0} max={100} value={filters.grayscale} 
                onChange={(e) => setFilters(f => ({ ...f, grayscale: Number(e.target.value) }))} 
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
              />
            </div>

            <button 
              onClick={() => setFilters({ brightness: 100, contrast: 100, sepia: 0, grayscale: 0 })} 
              style={{ width: "100%", padding: "0.75rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "8px", cursor: "pointer", marginTop: "1rem" }}
            >
              Reset Màu Sắc
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
