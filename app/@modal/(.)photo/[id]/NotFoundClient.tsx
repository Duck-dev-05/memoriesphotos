"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotFoundClient() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.back();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(5, 5, 5, 0.9)",
        backdropFilter: "blur(5px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem",
        animation: "fadeIn 0.2s ease-out"
      }}
      onClick={() => router.back()}
    >
      <div 
        style={{
          background: "var(--bg-primary)",
          padding: "3rem 4rem",
          borderRadius: "16px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          maxWidth: "500px",
          width: "100%",
          animation: "slideUp 0.3s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          fontFamily: "var(--font-heading)",
          fontSize: "4rem",
          color: "var(--accent-1)",
          lineHeight: 1,
          marginBottom: "1rem",
          opacity: 0.8
        }}>
          404
        </div>
        <h2 style={{
          fontFamily: "var(--font-heading)",
          fontSize: "2rem",
          fontStyle: "italic",
          color: "var(--text-primary)",
          marginBottom: "1rem"
        }}>
          Kỷ niệm bị thất lạc
        </h2>
        <p style={{
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginBottom: "2rem"
        }}>
          Có vẻ như bức ảnh này đã bị xóa hoặc bạn không có quyền truy cập. Nó không còn tồn tại trong bộ sưu tập này nữa.
        </p>
        
        <button 
          onClick={() => router.back()}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Đóng và quay lại
        </button>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          router.back();
        }}
        style={{
          position: "absolute",
          top: "2rem",
          right: "2rem",
          background: "rgba(255, 255, 255, 0.1)",
          border: "none",
          color: "white",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}} />
    </div>
  );
}
