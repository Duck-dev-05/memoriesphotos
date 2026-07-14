"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveEditedPhoto } from "@/app/actions";
import Link from "next/link";

export default function EditPhotoClient({ photo }: { photo: any }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sepia, setSepia] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [blur, setBlur] = useState(0);

  // Transformations State
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Load Image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImageObj(img);
    img.src = photo.url || photo.imageData || "";
  }, [photo]);

  // Apply edits to canvas
  const applyEdits = useCallback(() => {
    if (!imageObj || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate bounding box based on rotation
    const isRotated = rotation % 180 !== 0;
    const imgW = imageObj.width;
    const imgH = imageObj.height;

    // Update canvas size to match the rotated bounding box
    canvas.width = isRotated ? imgH : imgW;
    canvas.height = isRotated ? imgW : imgH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Build CSS filter string
    ctx.filter = `
      brightness(${brightness}%) 
      contrast(${contrast}%) 
      saturate(${saturation}%) 
      sepia(${sepia}%) 
      grayscale(${grayscale}%) 
      blur(${blur}px)
    `;

    // Move to center to rotate/flip
    ctx.translate(canvas.width / 2, canvas.height / 2);

    ctx.rotate((rotation * Math.PI) / 180);

    const scaleX = flipH ? -1 : 1;
    const scaleY = flipV ? -1 : 1;
    ctx.scale(scaleX, scaleY);

    // Draw image centered
    ctx.drawImage(imageObj, -imgW / 2, -imgH / 2);

  }, [imageObj, brightness, contrast, saturation, sepia, grayscale, blur, rotation, flipH, flipV]);

  // Re-draw whenever filters or transformations change
  useEffect(() => {
    applyEdits();
  }, [applyEdits]);

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvasRef.current!.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error("Could not create image blob");

      const file = new File([blob], 'edited.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append("file", file);

      await saveEditedPhoto(photo.id, formData);
      router.push(`/photo/${photo.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu ảnh");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSepia(0);
    setGrayscale(0);
    setBlur(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111', color: 'white' }}>
      {/* Header */}
      <header style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', borderBottom: '1px solid #333' }}>
        <Link href={`/photo/${photo.id}`} style={{ color: '#ccc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>←</span> Hủy
        </Link>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Chỉnh sửa ảnh</h1>
        <button onClick={handleSave} disabled={isSaving || !imageObj} style={{ background: 'var(--accent-1)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas Area */}
        <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', overflow: 'auto', background: '#000' }}>
          {!imageObj && <div style={{ color: '#888' }}>Đang tải ảnh...</div>}
          <canvas 
            ref={canvasRef} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: imageObj ? 'block' : 'none'
            }} 
          />
        </div>

        {/* Sidebar Controls */}
        <aside style={{ width: '300px', background: '#222', padding: '1.5rem', overflowY: 'auto', borderLeft: '1px solid #333' }}>
          
          {/* Rotation & Flip */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#888', marginBottom: '1rem' }}>Cắt & Xoay</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => setRotation(r => (r - 90) % 360)} style={{ flex: 1, padding: '0.5rem', background: '#333', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>↺ Trái</button>
              <button onClick={() => setRotation(r => (r + 90) % 360)} style={{ flex: 1, padding: '0.5rem', background: '#333', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>↻ Phải</button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={() => setFlipH(!flipH)} style={{ flex: 1, padding: '0.5rem', background: flipH ? 'var(--accent-1)' : '#333', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>↔ Ngang</button>
              <button onClick={() => setFlipV(!flipV)} style={{ flex: 1, padding: '0.5rem', background: flipV ? 'var(--accent-1)' : '#333', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>↕ Dọc</button>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Điều chỉnh</h3>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem' }}>Độ sáng</label>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{brightness}%</span>
              </div>
              <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} style={{ width: '100%' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem' }}>Tương phản</label>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{contrast}%</span>
              </div>
              <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} style={{ width: '100%' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem' }}>Độ bão hòa (Màu)</label>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{saturation}%</span>
              </div>
              <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(Number(e.target.value))} style={{ width: '100%' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem' }}>Độ ấm (Sepia)</label>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{sepia}%</span>
              </div>
              <input type="range" min="0" max="100" value={sepia} onChange={e => setSepia(Number(e.target.value))} style={{ width: '100%' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem' }}>Đen trắng</label>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{grayscale}%</span>
              </div>
              <input type="range" min="0" max="100" value={grayscale} onChange={e => setGrayscale(Number(e.target.value))} style={{ width: '100%' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem' }}>Làm mờ</label>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{blur}px</span>
              </div>
              <input type="range" min="0" max="20" value={blur} onChange={e => setBlur(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            
            <button onClick={handleReset} style={{ marginTop: '1rem', background: 'transparent', border: '1px solid #555', color: 'white', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
              Đặt lại mặc định
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}
