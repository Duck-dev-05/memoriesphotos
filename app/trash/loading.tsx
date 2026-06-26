import React from "react";

export default function LoadingTrash() {
  return (
    <main className="container" style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            Thùng rác
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Các mục bị xóa sẽ nằm ở đây. Bạn có thể khôi phục hoặc xóa vĩnh viễn chúng.
          </p>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="vintage-spinner"></div>
      </div>
    </main>
  );
}
