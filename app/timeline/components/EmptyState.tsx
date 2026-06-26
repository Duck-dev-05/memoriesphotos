export function EmptyState() {
  return (
    <div className="tl-empty animate-hero-3">
      <div className="tl-empty-icon" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '1px dashed rgba(201,122,126,0.3)', animation: 'spin-vintage 10s linear infinite' }} />
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="tl-empty-title">Chưa có ảnh nào</p>
      <p className="tl-empty-sub">Hãy tải ảnh lên để bắt đầu xây dựng dòng thời gian kỷ niệm của bạn.</p>
    </div>
  );
}
