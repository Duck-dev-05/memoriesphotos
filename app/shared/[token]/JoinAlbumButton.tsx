"use client";

import React, { useState } from "react";
import { joinPublicAlbum } from "@/app/actions/trash-timeline";
import { useRouter } from "next/navigation";

export default function JoinAlbumButton({ token, albumId }: { token: string, albumId: string }) {
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const res = await joinPublicAlbum(token);
      if (res.success) {
        // Navigate to the full album view in their own collection
        router.push(`/albums/${res.albumId}`);
      }
    } catch (err: any) {
      alert("Không thể tham gia album: " + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <button
      onClick={handleJoin}
      disabled={isJoining}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "var(--accent-1)",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: "20px",
        fontSize: "0.9rem",
        fontWeight: 600,
        cursor: isJoining ? "default" : "pointer",
        opacity: isJoining ? 0.7 : 1,
        transition: "all 0.2s"
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
      {isJoining ? "Đang tham gia..." : "Tham gia Album"}
    </button>
  );
}
