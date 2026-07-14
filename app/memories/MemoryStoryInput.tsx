"use client";

import { useState, useTransition, useEffect } from "react";
import { saveMemoryStory } from "@/app/actions";

export default function MemoryStoryInput({
  dayMonth,
  year,
  initialContent,
}: {
  dayMonth: string;
  year: number;
  initialContent: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    startTransition(async () => {
      await saveMemoryStory(dayMonth, year, content);
      setIsEditing(false);
    });
  };

  if (!isEditing && !initialContent) {
    return (
      <div className="memoryStoryContainer">
        <button className="addStoryBtn" onClick={() => setIsEditing(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Viết câu chuyện về kỷ niệm năm {year}...
        </button>
      </div>
    );
  }

  if (!isEditing && initialContent) {
    return (
      <div className="memoryStoryContainer hasContent">
        <p className="memoryStoryText">{initialContent}</p>
        <button className="editStoryBtn" onClick={() => setIsEditing(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Chỉnh sửa
        </button>
      </div>
    );
  }

  return (
    <div className="memoryStoryContainer isEditing">
      <textarea
        className="memoryStoryTextarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Kể lại câu chuyện của bạn vào ngày này năm ${year}...`}
        rows={4}
        disabled={isPending}
        autoFocus
      />
      <div className="memoryStoryActions">
        <button
          className="btn btn-secondary"
          onClick={() => {
            setContent(initialContent);
            setIsEditing(false);
          }}
          disabled={isPending}
          style={{ padding: "0.4rem 1rem", fontSize: "0.9rem" }}
        >
          Hủy
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isPending}
          style={{ padding: "0.4rem 1.2rem", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {isPending ? "Đang lưu..." : "Lưu câu chuyện"}
        </button>
      </div>
    </div>
  );
}
