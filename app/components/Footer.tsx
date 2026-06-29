"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (pathname?.startsWith('/photo/')) return null;

  return (
    <footer style={{ 
      marginTop: "auto", 
      padding: "4rem 2rem 3rem", 
      textAlign: "center", 
      borderTop: "var(--border-delicate)", 
      backgroundColor: "var(--bg-secondary)",
      color: "var(--text-secondary)", 
      position: "relative",
      overflow: "hidden"
    }}>

      <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", position: "relative", zIndex: 1 }}>
        
        <div style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontWeight: 600, fontSize: "1.35rem", color: "var(--text-primary)" }}>
          Chế tác thủ công với <span style={{ color: "var(--accent-1)", fontStyle: "normal" }}>♥</span> để lưu giữ câu chuyện của chúng ta.
        </div>
        
        <div style={{ display: "flex", gap: "2.5rem", fontSize: "1.05rem", fontFamily: "var(--font-heading)", fontWeight: 500 }}>
          <Link href="/" style={{ textDecoration: "none", color: "var(--text-secondary)", transition: "color var(--transition-fast)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Trang chủ</Link>
          <Link href="/albums" style={{ textDecoration: "none", color: "var(--text-secondary)", transition: "color var(--transition-fast)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Bộ sưu tập</Link>
          <Link href="/favorites" style={{ textDecoration: "none", color: "var(--text-secondary)", transition: "color var(--transition-fast)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Yêu thích</Link>
        </div>

        <div style={{ fontSize: "0.9rem", color: "var(--text-tertiary)", marginTop: "2rem", fontFamily: "var(--font-body)" }}>
          &copy; {currentYear} Kho Kỷ Niệm. Tất cả những khoảnh khắc đều được trân trọng.
        </div>
        
      </div>
    </footer>
  );
}
