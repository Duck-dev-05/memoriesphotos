import React from "react";
import Link from "next/link";
import { getTags } from "@/app/actions";
import styles from "./page.module.css";

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quản Lý Thẻ (Tags)</h1>
        <p className={styles.subtitle}>Sắp xếp kỷ niệm theo chủ đề</p>
      </header>

      {tags.length === 0 ? (
        <div className={styles.empty}>Chưa có thẻ nào được tạo.</div>
      ) : (
        <div className={styles.tagGrid}>
          {tags.map((tag) => (
            <Link key={tag.id} href={`/tags/${tag.name}`} className={styles.tagCard}>
              <div className="sticky-note" style={{ transform: `rotate(${Math.random() * 6 - 3}deg)`, height: '100%' }}>
                <div className={styles.tagName}>#{tag.name}</div>
                <div className={`${styles.tagCount} handwritten`}>{tag._count.photos} ảnh</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
