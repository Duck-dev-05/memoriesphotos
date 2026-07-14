"use client";

import { useState, useTransition } from "react";
import { createStory } from "@/app/actions/story";

export default function NewStoryForm() {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    // content and photoIds are no longer submitted here

    startTransition(() => {
      createStory(formData).catch(err => {
        alert("Lỗi: " + err.message);
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Tiêu đề câu chuyện</label>
        <input 
          type="text" 
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input"
          placeholder="Ví dụ: Chuyến đi Đà Lạt đáng nhớ..."
          required
          style={{ width: "100%", fontSize: "1.2rem", padding: "1rem" }}
        />
      </div>
      <button 
        type="submit" 
        className="btn" 
        disabled={isPending}
        style={{ padding: "1rem", fontSize: "1.1rem", alignSelf: "flex-end" }}
      >
        {isPending ? "Đang lưu..." : "Lưu Câu Chuyện"}
      </button>
    </form>
  );
}
