import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getSharedAlbums } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import styles from "../albums/page.module.css";

export const metadata = {
  title: "Album Đã Chia Sẻ - Our Memories",
};

export default async function SharedAlbumsPage() {
  const isAuth = await isAuthenticated();
  if (!isAuth) redirect("/login");

  const albums = await getSharedAlbums();

  return (
    <main>
      {/* ── Hero ─────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
            </svg>
            Chia sẻ
          </div>

          <h1 className={styles.heroTitle}>Album Của Bạn</h1>

          <p className={styles.heroSubtitle}>
            Quản lý những bộ sưu tập ảnh bạn đang chia sẻ công khai với mọi người.
          </p>
        </div>
      </section>

      {/* ── Grid ─────────────────────────────── */}
      <div className={styles.container}>
        {albums.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
            Bạn chưa chia sẻ album nào. <Link href="/albums" style={{ color: "var(--accent-1)" }}>Vào trang bộ sưu tập để chia sẻ</Link>.
          </div>
        ) : (
          <div className={styles.grid}>
            {albums.map((album: any, idx: number) => {
              const photoCount = album._count?.photos ?? 0;
              return (
                <Link 
                  key={album.id} 
                  href={`/albums/${album.id}`}
                  className={styles.albumCard}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className={styles.albumStack}>
                    <div className={styles.albumStackLayer} />
                    <div className={styles.albumStackLayer} />
                    <div className={styles.albumStackLayer}>
                      <div className={styles.albumStackInner}>
                        {album.coverImage ? (
                          <Image
                            src={album.coverImage}
                            alt={album.name}
                            fill
                            className={styles.albumCoverImg}
                            sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 320px"
                          />
                        ) : (
                          <div className={styles.albumEmptyIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className={styles.albumBadge}>{photoCount} Ảnh</div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.albumInfo}>
                    <h3 className={styles.albumTitle}>{album.name}</h3>
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "0.4rem", marginBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", background: "rgba(255, 0, 0, 0.05)", color: "var(--accent-1)", borderRadius: "12px", border: "1px solid rgba(255, 0, 0, 0.1)" }}>
                        Đang chia sẻ
                      </span>
                    </div>
                    {album.description && (
                      <p className={styles.albumDesc}>{album.description}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
