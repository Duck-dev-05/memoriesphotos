"use client";

import { useState, useRef, useEffect } from "react";
import { createAlbum, saveUploadedPhotoRecord } from "@/app/actions";
import { uploadFileLocalFirst } from "./uploadClientStorage";
import { useRouter, useParams, usePathname } from "next/navigation";

type UploadItem = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  file?: File;
  folderFiles?: File[];
  targetAlbumId?: string;
  targetStoryId?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: { uploaded: number, total: number };
};

function isVideoFile(file: File) {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ["mp4", "mov", "avi", "webm", "mkv"].includes(ext);
}

function getVideoSizeLimitBytes() {
  const configuredMb = Number(process.env.NEXT_PUBLIC_VIDEO_SIZE_LIMIT_MB);
  return Number.isFinite(configuredMb) && configuredMb > 0
    ? configuredMb * 1024 * 1024
    : 500 * 1024 * 1024;
}

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext);
}

export default function DragDropUploader({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const paramsId = (params?.id as string) || "";
  const isAlbumPage = pathname?.startsWith('/albums/');
  const isStoryPage = pathname?.startsWith('/about/');
  
  const albumId = isAlbumPage ? paramsId : "";
  const storyId = isStoryPage ? paramsId : "";
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Ref for drag events
  const dragCounter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      let allUploads: UploadItem[] = [];
      
      const entries: any[] = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) entries.push(entry);
        }
      }

      for (const entry of entries) {
        const result = await processTopLevelEntry(entry);
        if (result) allUploads.push(result);
      }

      if (allUploads.length > 0) {
        startUpload(allUploads);
      }
    }
  }

  function getFileFromEntry(entry: any): Promise<File | null> {
    return new Promise(resolve => {
      entry.file((file: File) => resolve(file), () => resolve(null));
    });
  }

  async function processTopLevelEntry(entry: any): Promise<UploadItem | null> {
    if (entry.isFile) {
      const file = await getFileFromEntry(entry);
      if (file && (isImageFile(file) || isVideoFile(file))) {
        return {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: 'file',
          file: file,
          targetAlbumId: albumId,
          targetStoryId: storyId,
          status: 'pending'
        };
      }
      return null;
    } else if (entry.isDirectory) {
      const files: File[] = [];
      await traverseFileTree(entry, '', files);
      
      if (files.length === 0) return null;

      return {
        id: Math.random().toString(36).substring(7),
        name: entry.name,
        type: 'folder',
        folderFiles: files,
        targetAlbumId: albumId,
        targetStoryId: storyId,
        status: 'pending',
        progress: { uploaded: 0, total: files.length }
      };
    }
    return null;
  }

  async function traverseFileTree(item: any, path: string = '', filesToUpload: File[]) {
    return new Promise<void>((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          if (isImageFile(file) || isVideoFile(file)) {
            filesToUpload.push(file);
          }
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const readEntries = () => {
          dirReader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) {
              resolve();
            } else {
              const promises = [];
              for (let i = 0; i < entries.length; i++) {
                promises.push(traverseFileTree(entries[i], path + item.name + "/", filesToUpload));
              }
              await Promise.all(promises);
              readEntries();
            }
          });
        };
        readEntries();
      } else {
        resolve();
      }
    });
  }

  async function startUpload(newItems: UploadItem[]) {
    setUploadItems(prev => [...prev, ...newItems]);
    setShowManager(true);
    setIsMinimized(false);

    const videoSizeLimit = getVideoSizeLimitBytes();

    for (const item of newItems) {
      setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'uploading' } : p));
      
      try {
        if (item.type === 'file' && item.file) {
          if (isVideoFile(item.file) && item.file.size > videoSizeLimit) {
            setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error' } : p));
            continue;
          }
          await uploadSingleFile(item.file, item.targetAlbumId, item.targetStoryId);
          setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'success' } : p));
        } else if (item.type === 'folder' && item.folderFiles) {
          // Create Album
          const formData = new FormData();
          formData.append("name", item.name);
          formData.append("description", "Tải lên từ thư mục");
          if (item.targetAlbumId) {
            formData.append("parentId", item.targetAlbumId);
          }
          const newAlbum = await createAlbum(formData);
          const folderAlbumId = newAlbum.id;

          let uploadedCount = 0;
          for (const file of item.folderFiles) {
            if (isVideoFile(file) && file.size > videoSizeLimit) {
              continue;
            }
            try {
              await uploadSingleFile(file, folderAlbumId, item.targetStoryId);
              uploadedCount++;
              setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, progress: { uploaded: uploadedCount, total: item.folderFiles!.length } } : p));
            } catch(e) {
              console.error("Failed to upload folder file", file.name, e);
            }
          }
          setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'success', progress: { uploaded: uploadedCount, total: item.folderFiles!.length } } : p));
        }
      } catch (err) {
        console.error("Upload failed for", item.name, err);
        setUploadItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error' } : p));
      }
    }

    router.refresh();
  }

  async function uploadSingleFile(file: File, albumId?: string, storyId?: string) {
    let exifDetails: any = {};
    if (!isVideoFile(file)) {
      try {
        const exifr = (await import('exifr')).default;
        const exifData = await exifr.parse(file, {
          tiff: true, exif: true, gps: true, reviveValues: true,
        });

        if (exifData) {
          exifDetails = {
            dateTaken: exifData.DateTimeOriginal ? new Date(exifData.DateTimeOriginal) : (exifData.CreateDate ? new Date(exifData.CreateDate) : null),
            cameraMake: (exifData.Make || exifData.make) ? String(exifData.Make || exifData.make).trim() : null,
            cameraModel: (exifData.Model || exifData.model) ? String(exifData.Model || exifData.model).trim() : null,
            lensModel: (exifData.LensModel || exifData.Lens || exifData.lens) ? String(exifData.LensModel || exifData.Lens || exifData.lens).trim() : null,
            focalLength: (exifData.FocalLength || exifData.focalLength) ? Number(exifData.FocalLength || exifData.focalLength) : null,
            fNumber: (exifData.FNumber || exifData.fNumber || exifData.ApertureValue) ? Number(exifData.FNumber || exifData.fNumber || exifData.ApertureValue) : null,
            iso: (exifData.ISO || exifData.iso) ? Number(exifData.ISO || exifData.iso) : null,
            exposureTime: (exifData.ExposureTime || exifData.exposureTime)
              ? ((exifData.ExposureTime || exifData.exposureTime) < 1 ? `1/${Math.round(1 / (exifData.ExposureTime || exifData.exposureTime))}` : String(exifData.ExposureTime || exifData.exposureTime))
              : null,
            latitude: exifData.latitude ? Number(exifData.latitude) : null,
            longitude: exifData.longitude ? Number(exifData.longitude) : null,
            width: (exifData.ImageWidth || exifData.ExifImageWidth) ? Number(exifData.ImageWidth || exifData.ExifImageWidth) : null,
            height: (exifData.ImageHeight || exifData.ExifImageHeight) ? Number(exifData.ImageHeight || exifData.ExifImageHeight) : null,
          };
        }
      } catch (e) {
        console.warn("Failed to parse EXIF for", file.name, e);
      }
    }

    const uploadUrl = await uploadFileLocalFirst(file);
    await saveUploadedPhotoRecord({
      url: uploadUrl,
      altText: file.name.replace(/\.[^/.]+$/, ""),
      description: "",
      albumId: albumId,
      storyId: storyId,
      exifData: exifDetails
    });
  }

  const totalItems = uploadItems.length;
  const completedItems = uploadItems.filter(i => i.status === 'success').length;
  const errorItems = uploadItems.filter(i => i.status === 'error').length;
  const isAllDone = totalItems > 0 && (completedItems + errorItems === totalItems);

  useEffect(() => {
    if (isAllDone && showManager) {
      const timer = setTimeout(() => {
        setShowManager(false);
        setTimeout(() => setUploadItems([]), 300);
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [isAllDone, showManager]);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const uploads: UploadItem[] = files.map(file => ({ 
        id: Math.random().toString(36).substring(7),
        name: file.name,
        type: 'file',
        file, 
        targetAlbumId: albumId, 
        targetStoryId: storyId,
        status: 'pending' 
      }));
      startUpload(uploads);
      e.target.value = '';
    }
  }

  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100%' }}
    >
      <input
        type="file"
        id="album-upload-input"
        multiple
        accept="image/*,video/*,.heic,.heif"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      {children}
      
      {isDragging && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1000,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: '4px dashed var(--accent-1)', borderRadius: '20px',
          margin: '0',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-1)', marginBottom: '1rem' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h2 style={{ color: 'var(--accent-1)', fontSize: '2rem', fontFamily: 'var(--font-heading)' }}>Thả ảnh, video hoặc thư mục vào đây</h2>
        </div>
      )}

      {showManager && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1001,
          background: 'white', borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          border: '1px solid rgba(0,0,0,0.05)',
          width: '350px',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{
            background: isAllDone ? '#4caf50' : 'var(--bg-primary)',
            color: isAllDone ? 'white' : 'var(--text-primary)',
            padding: '1rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(0,0,0,0.05)'
          }} onClick={() => setIsMinimized(!isMinimized)}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isAllDone && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
              {!isAllDone && <div className="loading-spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(201,122,126,0.3)', borderTopColor: 'var(--accent-1)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
              {isAllDone ? `Đã tải lên ${completedItems} mục` : `Đang tải lên ${completedItems}/${totalItems} mục...`}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>
                {isMinimized ? '▲' : '▼'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowManager(false); setUploadItems([]); }} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>
                ✕
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <div style={{
              maxHeight: '300px', overflowY: 'auto', padding: '0', background: '#fcfcfc'
            }}>
              {uploadItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', padding: '0.8rem 1rem',
                  borderBottom: '1px solid #f0f0f0', gap: '1rem', background: 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    {item.type === 'folder' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {item.name}
                    </div>
                    {item.type === 'folder' && item.progress && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {item.progress.uploaded} / {item.progress.total} tệp
                      </div>
                    )}
                  </div>
                  <div>
                    {item.status === 'uploading' && <div className="loading-spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(201,122,126,0.3)', borderTopColor: 'var(--accent-1)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
                    {item.status === 'success' && <span style={{ color: '#4caf50', display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>}
                    {item.status === 'error' && <span style={{ color: '#f44336', display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>}
                    {item.status === 'pending' && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Chờ...</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}} />
    </div>
  );
}
