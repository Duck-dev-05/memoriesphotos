"use client";

import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "calc(100vh - 90px)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-secondary)" }}>
      <div className="loading-spinner"></div>
      <span style={{ marginLeft: "1rem", fontFamily: "var(--font-heading)", color: "var(--text-secondary)" }}>Đang tải bản đồ...</span>
    </div>
  ),
});

export default function MapWrapper({ photos }: { photos: any[] }) {
  return <DynamicMap photos={photos} />;
}
