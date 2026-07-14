"use client";
import React, { useState } from "react";
import PhotoEditor from "./PhotoEditor";

export default function EditorButton({ photoId, imageUrl }: { photoId: string, imageUrl: string }) {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <>
      <button onClick={() => setShowEditor(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🎨 Chỉnh sửa
      </button>
      {showEditor && (
        <PhotoEditor 
          photoId={photoId} 
          imageUrl={imageUrl} 
          onClose={() => setShowEditor(false)} 
        />
      )}
    </>
  );
}
