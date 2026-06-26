import React from "react";
import styles from "./page.module.css";

export default function LoadingSearch() {
  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tìm kiếm</h1>
        <p className={styles.subtitle}>
          Khám phá lại những ký ức qua thông số nhiếp ảnh.
        </p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div style={{ height: "400px", background: "rgba(0,0,0,0.05)", borderRadius: "12px" }}></div>
        </aside>
        
        <div className={styles.resultsArea}>
          <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="vintage-spinner"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
