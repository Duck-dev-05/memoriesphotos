"use client";

import { useState, useTransition, useEffect } from "react";
import { updateStoryContent } from "@/app/actions/story";

interface StoryContentEditorProps {
  storyId: string;
  initialContent: string;
}

export default function StoryContentEditor({ storyId, initialContent }: StoryContentEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    startTransition(async () => {
      await updateStoryContent(storyId, content);
      setIsEditing(false);
    });
  };

  const handleCancel = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  if (!isEditing && !initialContent) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", background: "var(--bg-secondary)", borderRadius: "16px", marginBottom: "3rem" }}>
        <button 
          onClick={() => setIsEditing(true)}
          style={{
            background: "none", border: "1px dashed var(--accent-1)", color: "var(--accent-1)",
            padding: "1rem 2rem", borderRadius: "8px", fontSize: "1.1rem", cursor: "pointer",
            fontFamily: "var(--font-heading)", fontStyle: "italic"
          }}
        >
          + Thêm nội dung (Profound meaning)
        </button>
      </div>
    );
  }

  if (!isEditing && initialContent) {
    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto 3rem auto', 
        padding: '2rem',
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        position: 'relative'
      }}>
        <div style={{
          fontSize: '1.1rem',
          lineHeight: '1.8',
          fontFamily: 'var(--font-heading)',
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap'
        }}>
          {initialContent}
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'var(--bg-primary)', border: '1px solid var(--border-delicate)',
            padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem',
            cursor: 'pointer', opacity: 0.8
          }}
        >
          Chỉnh sửa
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto 3rem auto', display: "flex", flexDirection: "column", gap: "1rem" }}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Kể lại cảm xúc, ý nghĩa sâu sắc của những bức ảnh này..."
        rows={8}
        style={{ 
          width: "100%", fontSize: "1.1rem", padding: "1.5rem", resize: "vertical", 
          fontFamily: "var(--font-heading)", fontStyle: "italic",
          background: "var(--bg-primary)", border: "1px solid var(--accent-1)", borderRadius: "16px"
        }}
      />
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button 
          onClick={handleCancel}
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
          {isPending ? "Đang lưu..." : "Lưu Nội Dung"}
        </button>
      </div>
    </div>
  );
}
