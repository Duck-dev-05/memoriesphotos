import React from "react";
import styles from "./page.module.css";

export default function LoadingAlbumDetail() {
  return (
    <div className={styles.page}>
      <nav className={styles.topRail} aria-label="Albums navigation">
        <div className={styles.topRailItem} style={{ width: "100px", height: "20px", background: "rgba(0,0,0,0.05)", borderRadius: "4px" }} />
        <div className={styles.topRailDivider} />
        <div className={styles.topRailItem} style={{ width: "120px", height: "20px", background: "rgba(0,0,0,0.05)", borderRadius: "4px" }} />
      </nav>

      <header className={styles.albumBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerBreadcrumb} style={{ width: "150px", height: "16px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", marginBottom: "1rem" }} />
          <div style={{ width: "60%", height: "40px", background: "rgba(0,0,0,0.05)", borderRadius: "8px", marginBottom: "1rem" }} />
          <div style={{ width: "80%", height: "20px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", marginBottom: "1rem" }} />
        </div>
        <div className={styles.bannerRight} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div className="vintage-spinner"></div>
        </div>
      </header>
      
      <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', color: 'var(--text-secondary)' }}>Đang mở album...</p>
      </div>
    </div>
  );
}
