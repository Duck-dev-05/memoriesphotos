"use client";

import dynamic from "next/dynamic";
import React from "react";

// Dynamically import the map component with ssr disabled
const DynamicMap = dynamic(() => import("./DynamicMap"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)" }}>
      <p style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--text-secondary)" }}>
        Đang tải bản đồ...
      </p>
    </div>
  ),
});

export default function MapWrapper({ photos }: { photos: any[] }) {
  return <DynamicMap photos={photos} />;
}
