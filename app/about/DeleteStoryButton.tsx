"use client";

import { useTransition } from "react";
import { deleteStory } from "@/app/actions/story";

export default function DeleteStoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("Bạn có chắc chắn muốn xóa câu chuyện này không?")) {
      startTransition(() => {
        deleteStory(id);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Xóa câu chuyện"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isPending ? "wait" : "pointer",
        backdropFilter: "blur(4px)",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18"></path>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
      </svg>
    </button>
  );
}
