"use client";

import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial state
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      background: "#c97a7e",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px",
      gap: "8px",
      fontFamily: "var(--font-body), sans-serif",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      animation: "slideDown 0.3s ease-out forwards"
    }}>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      <WifiOff size={18} />
      <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>
        Bạn đang ngoại tuyến. Vui lòng kiểm tra lại kết nối mạng.
      </span>
    </div>
  );
}
