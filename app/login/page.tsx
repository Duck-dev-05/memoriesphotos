"use client";

import { useState } from "react";
import { login } from "@/app/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      await login(formData);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ position: "absolute", top: "120px", left: 0, right: 0, bottom: 0, zIndex: 99, display: "flex", backgroundColor: "#fdfaf3", overflowY: "auto" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .auth-input:focus {
          border-color: var(--accent-1) !important;
          box-shadow: 0 0 0 4px rgba(201, 122, 126, 0.1);
          outline: none;
        }
        .auth-btn {
          transition: all 0.3s ease;
        }
        .auth-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(201, 122, 126, 0.3);
          background-color: #b86064 !important;
        }
        .google-btn:hover {
          background-color: #f8f9fa !important;
          border-color: rgba(59, 47, 47, 0.3) !important;
        }
        .image-panel {
          position: relative;
          flex: 1.2;
          display: none;
        }
        @media (min-width: 900px) {
          .image-panel {
            display: block;
          }
        }
      `}} />

      {/* Left Form Panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "2rem", minHeight: "100vh" }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>

          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "4rem", color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.3s" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}>Về trang chủ</span>
          </Link>

          <h1 style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "3rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
            Chào mừng trở lại
          </h1>
          <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", marginBottom: "3rem", fontSize: "1.1rem" }}>
            Đăng nhập để lật lại những trang lưu bút.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <label htmlFor="email" style={{ display: "block", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>Email của bạn</label>
              <input
                type="email"
                id="email"
                className="auth-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", padding: "1rem 1.25rem", borderRadius: "12px", border: "1.5px solid rgba(59, 47, 47, 0.15)", background: "white", color: "var(--text-primary)", fontFamily: "var(--font-body)", fontSize: "1rem", transition: "all 0.3s" }}
                placeholder="VD: john@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                <span>Mật khẩu</span>
              </label>
              <input
                type="password"
                id="password"
                className="auth-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", padding: "1rem 1.25rem", borderRadius: "12px", border: "1.5px solid rgba(59, 47, 47, 0.15)", background: "white", color: "var(--text-primary)", fontFamily: "var(--font-body)", fontSize: "1rem", transition: "all 0.3s", letterSpacing: "2px" }}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={{ padding: "0.75rem", backgroundColor: "rgba(201, 122, 126, 0.1)", border: "1px solid rgba(201, 122, 126, 0.3)", borderRadius: "8px", color: "var(--accent-1)", fontSize: "0.95rem", textAlign: "center" }}>
                {error}
              </div>
            )}

            <button type="submit" className="auth-btn" disabled={isLoading} style={{ width: "100%", fontSize: "1.1rem", padding: "1rem", backgroundColor: "var(--accent-1)", color: "white", borderRadius: "12px", fontWeight: "bold", border: "none", cursor: "pointer", marginTop: "1rem" }}>
              {isLoading ? "Đang mở khóa..." : "Vào sổ lưu niệm"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", margin: "1.5rem 0", color: "rgba(59, 47, 47, 0.4)" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(59, 47, 47, 0.15)" }}></div>
            <span style={{ padding: "0 1rem", fontSize: "0.9rem", fontFamily: "var(--font-body)" }}>hoặc</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(59, 47, 47, 0.15)" }}></div>
          </div>
          
          <a href="/api/auth/google" className="google-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", width: "100%", padding: "1rem", backgroundColor: "white", color: "var(--text-primary)", borderRadius: "12px", border: "1.5px solid rgba(59, 47, 47, 0.15)", fontWeight: 600, fontSize: "1.05rem", cursor: "pointer", textDecoration: "none", transition: "all 0.3s" }}>
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Đăng nhập bằng Google
          </a>

          <div style={{ marginTop: "2.5rem", textAlign: "center", fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Bạn chưa có chìa khóa?{" "}
            <Link href="/signup" style={{ color: "var(--accent-1)", textDecoration: "none", fontWeight: "bold", borderBottom: "1px solid var(--accent-1)", paddingBottom: "2px" }}>
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>

      {/* Right Image Panel */}
      <div className="image-panel">
        <Image
          src="/images/login_bg.png"
          alt="Vintage polaroids and camera"
          fill
          sizes="(max-width: 900px) 0vw, 60vw"
          style={{ objectFit: "cover" }}
          priority
        />
        {/* Soft gradient overlay to blend into the white background smoothly */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(253, 250, 243, 1) 0%, rgba(253, 250, 243, 0) 15%, rgba(0,0,0,0.1) 100%)" }}></div>
      </div>
    </div>
  );
}
