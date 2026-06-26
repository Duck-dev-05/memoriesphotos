"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  return (
    <select
      value={currentSort}
      onChange={(e) => {
        router.push(`/albums?sort=${e.target.value}`);
      }}
      style={{
        padding: "0.4rem 1rem",
        borderRadius: "20px",
        border: "1px solid rgba(59,47,47,0.15)",
        background: "rgba(255,255,255,0.8)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-body)",
        fontSize: "0.95rem",
        outline: "none",
        cursor: "pointer"
      }}
    >
      <option value="newest">Mới nhất</option>
      <option value="oldest">Cũ nhất (Cũ - Mới)</option>
      <option value="name">Tên (A-Z)</option>
    </select>
  );
}
