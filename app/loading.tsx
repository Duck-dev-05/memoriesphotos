export default function Loading() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      width: "100%",
      gap: "1.5rem",
      animation: "fadeIn 0.3s ease-in-out"
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin-vintage {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `
      }} />
      <div style={{
        width: "48px",
        height: "48px",
        border: "3px solid rgba(201, 122, 126, 0.2)",
        borderTopColor: "var(--accent-1)",
        borderRadius: "50%",
        animation: "spin-vintage 1s linear infinite"
      }} />
      <p style={{
        fontFamily: "var(--font-heading)",
        fontStyle: "italic",
        color: "var(--text-secondary)",
        fontSize: "1.2rem",
        letterSpacing: "1px"
      }}>
        Đang mở trang lưu bút...
      </p>
    </div>
  );
}
