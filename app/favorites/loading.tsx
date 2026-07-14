import React from "react";

export default function LoadingFavorites() {
  return (
    <main className="container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <section className="hero" style={{ padding: "6rem 1rem 3rem", textAlign: "center" }}>
        <h1 className="hero-title" style={{ fontFamily: "var(--font-heading)", fontSize: "3rem", fontStyle: "italic", marginBottom: "1rem" }}>Yêu thích</h1>
        <p className="hero-subtitle" style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>Những khoảnh khắc trân quý nhất của bạn.</p>
      </section>

      <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="vintage-spinner"></div>
      </div>
    </main>
  );
}
