"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/app/actions";
import type { SessionPayload } from "@/lib/auth";
import { useState, useRef } from "react";

export default function Navbar({ session }: { session: SessionPayload | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 300);
  };

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q");
    if (query && query.toString().trim() !== "") {
      router.push(`/search?q=${encodeURIComponent(query.toString().trim())}`);
    } else {
      router.push(`/search`);
    }
  }

  return (
    <>
      <nav style={{
        position: "sticky",
        top: 0,
        height: "90px",
        display: "flex",
        alignItems: "center",
        backgroundColor: "rgba(253, 251, 247, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "var(--border-delicate)",
        zIndex: 100000,
        transition: "all var(--transition-normal)",
        width: "100%",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: 0 }}>

          {/* BRANDING */}
          <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: "0.25rem", minWidth: "max-content", paddingRight: "1rem" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "1rem", textDecoration: "none", transition: "transform var(--transition-normal)" }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px", lineHeight: 1 }}>
                  Kỷ Niệm
                </span>
                <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-body)", letterSpacing: "2px", marginTop: "4px", color: "var(--accent-1)", textTransform: "uppercase" }}>
                  Của Chúng Ta
                </span>
              </div>
            </Link>
          </div>

          {/* NAV LINKS (DESKTOP) */}
          <div className="nav-links-desktop" style={{ flex: "1 1 auto", display: "flex", justifyContent: "center", gap: "0.5rem" }}>
            <Link href="/albums" className={`vintage-nav-link ${pathname.startsWith("/albums") ? "active" : ""}`} prefetch={true}>
              <span>Bộ Sưu Tập</span>
            </Link>
            <Link href="/timeline" className={`vintage-nav-link ${pathname === "/timeline" ? "active" : ""}`} prefetch={true}>
              <span>Dòng thời gian</span>
            </Link>
            <Link href="/memories" className={`vintage-nav-link ${pathname === "/memories" ? "active" : ""}`} prefetch={true}>
              <span>Ngày này năm xưa</span>
            </Link>
            <Link href="/about" className={`vintage-nav-link ${pathname.startsWith("/about") ? "active" : ""}`} prefetch={true}>
              <span>Nhật Ký</span>
            </Link>
          </div>

          {/* SEARCH & AUTH */}
          <div style={{ flex: "1 1 auto", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1.5rem", minWidth: "max-content", paddingLeft: "1rem" }}>
            <form className="nav-search-desktop" onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <input
                type="text"
                name="q"
                className="search-input"
                placeholder="Tìm kiếm..."
              />
              <button type="submit" style={{ position: "absolute", left: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-secondary)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </form>

            {session ? (
              <div
                className="nav-auth-desktop"
                style={{ position: "relative" }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", transition: "all var(--transition-normal)", border: "1px solid transparent" }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-polaroid)'; e.currentTarget.style.borderColor = 'rgba(59,47,47,0.1)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}>
                  {session.image ? (
                    <img src={session.image} alt={session.name} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", filter: "sepia(0.3)" }} />
                  ) : (
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--bg-tertiary)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontFamily: "var(--font-heading)", fontSize: "1rem", border: "1px solid var(--text-secondary)" }}>
                      {session.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontWeight: 600, color: "var(--text-primary)", fontSize: "1.05rem" }}>
                    {session.name.split(' ')[0]}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>

                {isDropdownOpen && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "0.5rem", background: "var(--bg-polaroid)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)", border: "var(--border-delicate)", minWidth: "200px", overflow: "hidden", zIndex: 100, animation: "fadeIn 0.2s ease" }}>
                    <Link href="/profile" prefetch={true} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", color: "var(--text-primary)", textDecoration: "none", borderBottom: "1px dashed rgba(59,47,47,0.1)", transition: "background var(--transition-fast)", fontSize: "0.95rem", fontFamily: "var(--font-body)" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      Hồ sơ của tôi
                    </Link>

                    <Link href="/favorites" prefetch={true} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", color: "var(--text-primary)", textDecoration: "none", borderBottom: "1px dashed rgba(59,47,47,0.1)", transition: "background var(--transition-fast)", fontSize: "0.95rem", fontFamily: "var(--font-body)" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      Ảnh Yêu Thích
                    </Link>

                    <Link href="/map" prefetch={true} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", color: "var(--text-primary)", textDecoration: "none", borderBottom: "1px dashed rgba(59,47,47,0.1)", transition: "background var(--transition-fast)", fontSize: "0.95rem", fontFamily: "var(--font-body)" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>
                      Bản đồ vị trí
                    </Link>

                    <Link href="/stats" prefetch={true} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", color: "var(--text-primary)", textDecoration: "none", borderBottom: "1px dashed rgba(59,47,47,0.1)", transition: "background var(--transition-fast)", fontSize: "0.95rem", fontFamily: "var(--font-body)" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                      Thống kê máy ảnh
                    </Link>

                    <Link href="/shared-albums" prefetch={true} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", color: "var(--text-primary)", textDecoration: "none", borderBottom: "1px dashed rgba(59,47,47,0.1)", transition: "background var(--transition-fast)", fontSize: "0.95rem", fontFamily: "var(--font-body)" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
                      Album đã chia sẻ
                    </Link>
                    <Link href="/trash" prefetch={true} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", color: "var(--text-primary)", textDecoration: "none", borderBottom: "1px dashed rgba(59,47,47,0.1)", transition: "background var(--transition-fast)", fontSize: "0.95rem", fontFamily: "var(--font-body)" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      Thùng rác
                    </Link>
                    <Link href="/settings" prefetch={true} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", color: "var(--text-primary)", textDecoration: "none", borderBottom: "1px dashed rgba(59,47,47,0.1)", transition: "background var(--transition-fast)", fontSize: "0.95rem", fontFamily: "var(--font-body)" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                      Cài đặt
                    </Link>
                    <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", color: "var(--accent-1)", background: "transparent", border: "none", cursor: "pointer", transition: "background var(--transition-fast)", fontSize: "0.95rem", fontFamily: "var(--font-body)", fontWeight: 500 }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nav-auth-desktop" style={{ display: "flex", gap: "0.5rem" }}>
                <Link href="/login" className="btn btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.95rem" }} prefetch={true}>
                  Đăng nhập
                </Link>
                <Link href="/signup" className="btn btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.95rem" }} prefetch={true}>
                  Đăng ký
                </Link>
              </div>
            )}

            {/* MOBILE ICONS (HAMBURGER + PROFILE) */}
            <div className="nav-links-mobile-toggle" style={{ display: "none" }}>
              {session ? (
                <Link href="/profile" style={{ display: "flex", padding: "0.2rem" }}>
                  {session.image ? (
                    <img src={session.image} alt={session.name} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", filter: "sepia(0.3)" }} />
                  ) : (
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-tertiary)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontFamily: "var(--font-heading)", fontSize: "0.9rem", border: "1px solid var(--text-secondary)" }}>
                      {session.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
              ) : (
                <Link href="/login" style={{ color: "var(--text-primary)", padding: "0.5rem", display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </Link>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                  color: "var(--text-primary)"
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isMobileMenuOpen ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </>
                  ) : (
                    <>
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <line x1="3" y1="18" x2="21" y2="18"></line>
                    </>
                  )}
                </svg>
              </button>
            </div>
            <style>{`
              @media (max-width: 768px) {
                .nav-links-mobile-toggle { display: flex !important; align-items: center; gap: 0.25rem; }
                .nav-search-desktop, .nav-auth-desktop { display: none !important; }
              }
            `}</style>
          </div>
        </div>

        {/* MOBILE FULLSCREEN MENU OVERLAY */}
        {isMobileMenuOpen && (
          <div style={{
            position: "absolute",
            top: "90px",
            left: 0,
            right: 0,
            height: "calc(100vh - 90px)",
            background: "var(--bg-primary)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "3rem 2rem",
            zIndex: 99999,
            animation: "fadeIn 0.3s ease",
            overflowY: "auto"
          }}>
            <form onSubmit={(e) => { setIsMobileMenuOpen(false); handleSearch(e); }} style={{ display: "flex", alignItems: "center", position: "relative", marginBottom: "3.5rem", width: "100%", maxWidth: "320px" }}>
              <input type="text" name="q" className="search-input" placeholder="Tìm kiếm..." style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 3rem", fontSize: "1.1rem", borderRadius: "30px", border: "1px solid rgba(0,0,0,0.1)", background: "white", boxShadow: "var(--shadow-sm)" }} />
              <button type="submit" style={{ position: "absolute", left: "1rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2.2rem", width: "100%" }}>
              <Link href="/albums" style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--text-primary)", textDecoration: "none", fontStyle: "italic", transition: "color 0.2s" }} onClick={() => setIsMobileMenuOpen(false)}>Bộ Sưu Tập</Link>
              <Link href="/timeline" style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--text-primary)", textDecoration: "none", fontStyle: "italic", transition: "color 0.2s" }} onClick={() => setIsMobileMenuOpen(false)}>Dòng thời gian</Link>
              <Link href="/memories" style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--text-primary)", textDecoration: "none", fontStyle: "italic", transition: "color 0.2s" }} onClick={() => setIsMobileMenuOpen(false)}>Ngày này năm xưa</Link>
              <Link href="/about" style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--text-primary)", textDecoration: "none", fontStyle: "italic", transition: "color 0.2s" }} onClick={() => setIsMobileMenuOpen(false)}>Nhật Ký</Link>
            </div>

            <div style={{ width: "80px", height: "2px", background: "var(--accent-1)", margin: "3.5rem 0", opacity: 0.3 }} />

            {session ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.8rem", width: "100%", paddingBottom: "3rem" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem" }}>
                  {session.image ? (
                    <img src={session.image} alt={session.name} style={{ width: "70px", height: "70px", borderRadius: "50%", objectFit: "cover", border: "3px solid white", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }} />
                  ) : (
                    <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.8rem", color: "var(--text-primary)", border: "3px solid white", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>{session.name.charAt(0).toUpperCase()}</div>
                  )}
                  <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "1.3rem", color: "var(--text-primary)" }}>{session.name}</span>
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <Link href="/profile" className="btn btn-secondary" style={{ padding: "0.6rem 1.5rem", borderRadius: "20px" }} onClick={() => setIsMobileMenuOpen(false)}>Hồ sơ</Link>
                  <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="btn btn-secondary" style={{ padding: "0.6rem 1.5rem", borderRadius: "20px", color: "var(--accent-1)", borderColor: "var(--accent-1)" }}>Đăng xuất</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", marginTop: "1rem", alignItems: "center" }}>
                  <Link href="/favorites" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem", padding: "0.5rem" }} onClick={() => setIsMobileMenuOpen(false)}>Ảnh Yêu Thích</Link>
                  <Link href="/map" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem", padding: "0.5rem" }} onClick={() => setIsMobileMenuOpen(false)}>Bản đồ vị trí</Link>
                  <Link href="/stats" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem", padding: "0.5rem" }} onClick={() => setIsMobileMenuOpen(false)}>Thống kê máy ảnh</Link>
                  <Link href="/shared-albums" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem", padding: "0.5rem" }} onClick={() => setIsMobileMenuOpen(false)}>Album đã chia sẻ</Link>
                  <Link href="/trash" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem", padding: "0.5rem" }} onClick={() => setIsMobileMenuOpen(false)}>Thùng rác</Link>
                  <Link href="/settings" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem", padding: "0.5rem" }} onClick={() => setIsMobileMenuOpen(false)}>Cài đặt</Link>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "260px", paddingBottom: "3rem" }}>
                <Link href="/login" className="btn btn-secondary" style={{ width: "100%", borderRadius: "30px", padding: "0.8rem" }} onClick={() => setIsMobileMenuOpen(false)}>Đăng nhập</Link>
                <Link href="/signup" className="btn btn-primary" style={{ width: "100%", borderRadius: "30px", padding: "0.8rem" }} onClick={() => setIsMobileMenuOpen(false)}>Đăng ký</Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
