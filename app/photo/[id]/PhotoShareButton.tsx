"use client";
import React, { useState, useRef } from "react";
import { generatePhotoShareLink, removePhotoShareLink } from "@/app/actions";

export default function PhotoShareButton({ photoId, existingToken }: { photoId: string, existingToken?: string | null }) {
  const [token, setToken] = useState(existingToken);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  const handleGenerateLink = async () => {
    try {
      if (!token) {
        const newToken = await generatePhotoShareLink(photoId);
        setToken(newToken);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tạo link chia sẻ.");
    }
  };

  const handleUnshare = async () => {
    try {
      await removePhotoShareLink(photoId);
      setToken(null);
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tắt chia sẻ.");
    }
  };

  const getUrl = () => {
    if (typeof window !== "undefined") {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
      return `${baseUrl}/shared/${token}`;
    }
    return "";
  };

  const url = getUrl();

  const handleCopy = () => {
    if (!url) return;
    
    let success = false;
    
    // 1. Try synchronous execCommand first (works in most browsers on click)
    if (inputRef.current) {
      inputRef.current.select();
      inputRef.current.setSelectionRange(0, 99999); // For mobile devices
      try {
        success = document.execCommand('copy');
      } catch (err) {
        console.warn("execCommand failed", err);
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } else if (navigator.clipboard) {
      // 2. Fallback to modern Clipboard API
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(() => {
          alert("Trình duyệt chặn copy tự động. Vui lòng bấm Ctrl+C (hoặc Command+C) để copy link đang được bôi đen!");
        });
    } else {
      // 3. Fallback to manual prompt
      alert("Trình duyệt chặn copy tự động. Vui lòng bấm Ctrl+C (hoặc Command+C) để copy link đang được bôi đen!");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button 
        type="button"
        onClick={handleOpenModal} 
        className="btn btn-secondary"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          background: token ? "var(--accent-1)" : "var(--bg-secondary)",
          color: token ? "white" : "var(--text-primary)",
          border: token ? "1px solid var(--accent-1)" : "1px solid rgba(0,0,0,0.1)",
        }}
        title="Chia sẻ ảnh"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        {token ? "Đang chia sẻ" : "Chia sẻ"}
      </button>

      {isOpen && (
        <div style={{
          position: "absolute", 
          bottom: "120%", 
          right: "0", 
          background: "white", 
          padding: "1rem", 
          borderRadius: "12px", 
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)", 
          width: "280px",
          display: "flex", 
          flexDirection: "column", 
          gap: "0.8rem", 
          zIndex: 50,
          border: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Chia sẻ ảnh này</h4>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--text-secondary)" }}>✕</button>
          </div>
          
          {!token ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <p style={{ marginBottom: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Ảnh này hiện đang ở chế độ riêng tư. Bật chia sẻ để lấy link gửi cho bạn bè.</p>
              <button
                type="button"
                onClick={handleGenerateLink}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.8rem", fontWeight: "bold" }}
              >
                Bật chia sẻ ảnh
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
                <button 
                  type="button"
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "rgba(24, 119, 242, 0.08)", color: "#1877F2", padding: "0.8rem 0.5rem", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(24, 119, 242, 0.15)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(24, 119, 242, 0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
                  Facebook
                </button>
                <button 
                  type="button"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=Xem%20ảnh%20tuyệt%20đẹp%20này!`, '_blank')}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "rgba(0, 0, 0, 0.05)", color: "#000", padding: "0.8rem 0.5rem", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0, 0, 0, 0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.004 3.985H5.078z"></path></svg>
                  X (Twitter)
                </button>
                <button 
                  type="button"
                  onClick={() => window.open(`https://api.whatsapp.com/send?text=Xem%20ảnh%20tuyệt%20đẹp%20này!%20${encodeURIComponent(url)}`, '_blank')}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", background: "rgba(37, 211, 102, 0.08)", color: "#25D366", padding: "0.8rem 0.5rem", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", transition: "all 0.2s" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  WhatsApp
                </button>
              </div>
              
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input 
                    ref={inputRef}
                    type="text" 
                    value={url} 
                    readOnly 
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "8px",
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "var(--bg-secondary)",
                      fontSize: "0.8rem",
                      color: "var(--text-primary)",
                      outline: "none"
                    }}
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <button 
                    type="button"
                    onClick={handleCopy} 
                    style={{ 
                      padding: "0.6rem 1rem", 
                      background: copied ? "var(--accent-1)" : "var(--text-primary)", 
                      border: "none", 
                      borderRadius: "8px", 
                      cursor: "pointer", 
                      fontWeight: "600", 
                      color: "white", 
                      transition: "all 0.2s",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      whiteSpace: "nowrap",
                      fontSize: "0.8rem"
                    }}
                  >
                    {copied ? "Đã copy" : "Copy"}
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={handleUnshare}
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    marginTop: "1rem",
                    background: "transparent",
                    color: "#dc3545",
                    border: "1px dashed rgba(220, 53, 69, 0.4)",
                    borderRadius: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220, 53, 69, 0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Tắt chia sẻ ảnh
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
