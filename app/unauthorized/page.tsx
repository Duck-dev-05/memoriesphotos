import Link from "next/link";
import styles from "./unauthorized.module.css";

export default function UnauthorizedPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>401</div>
        <h1 className={styles.title}>Truy Cập Bị Từ Chối</h1>
        <p className={styles.description}>
          Bạn cần phải đăng nhập để xem nội dung này. Vui lòng đăng nhập hoặc quay lại trang chủ.
        </p>
        <div className={styles.actions}>
          <Link href="/login" className="btn btn-primary">
            Đăng Nhập
          </Link>
          <Link href="/" className="btn btn-secondary">
            Về Trang Chủ
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
