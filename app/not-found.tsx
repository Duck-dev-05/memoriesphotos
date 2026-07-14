import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>404</div>
        <h1 className={styles.title}>Không tìm thấy trang</h1>
        <p className={styles.description}>
          Có vẻ như kỷ niệm này đã bị thất lạc hoặc trang bạn đang tìm kiếm không còn tồn tại.
        </p>
        <div className={styles.actions}>
          <Link href="/" className="btn btn-primary">
            Về Trang Chủ
          </Link>
          <Link href="/albums" className="btn btn-secondary">
            Xem Bộ Sưu Tập
          </Link>
        </div>
      </div>
      
      {/* Decorative polaroid elements */}
      <div className={styles.decorativeElements}>
        <div className={`${styles.polaroid} ${styles.polaroid1}`}></div>
        <div className={`${styles.polaroid} ${styles.polaroid2}`}></div>
      </div>
    </div>
  );
}
