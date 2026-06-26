import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAlbums } from "@/app/actions";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "./page.module.css";
import DeleteAlbumButton from "./DeleteAlbumButton";

import SortDropdown from "./SortDropdown";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Bộ Sưu Tập",
  description: "Khám phá tất cả các bộ sưu tập kỷ niệm, nơi mỗi album là một ngăn kéo lưu giữ ký ức.",
  openGraph: {
    title: "Bộ Sưu Tập | Kỷ Niệm",
    description: "Khám phá tất cả các bộ sưu tập kỷ niệm, nơi mỗi album là một ngăn kéo lưu giữ ký ức.",
    url: "/albums",
  }
};

async function AlbumsData({ searchParamsPromise }: { searchParamsPromise: Promise<{ sort?: string }> }) {
  const { sort } = await searchParamsPromise;
  let albums = await getAlbums();

  if (sort === "oldest") {
    albums = [...albums].reverse();
  } else if (sort === "name") {
    albums = [...albums].sort((a, b) => a.name.localeCompare(b.name));
  }

  const totalPhotos = albums.reduce((sum: number, a: any) => {
    const own = a._count?.photos ?? a.photos.length;
    const children =
      a.children?.reduce(
        (s: number, c: any) => s + (c._count?.photos ?? (c.photos ? c.photos.length : 0)),
        0
      ) ?? 0;
    return sum + own + children;
  }, 0);

  return (
    <>
      {/* ── Hero ─────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Bộ sưu tập ký ức
          </div>

          <h1 className={styles.heroTitle}>Bộ sưu tập</h1>

          <p className={styles.heroSubtitle}>
            Những ngăn kéo lưu giữ ký ức, từng bức ảnh là một câu chuyện đang chờ được kể lại.
          </p>

          {albums.length > 0 && (
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>{albums.length}</span>
                <span className={styles.heroStatLabel}>Album</span>
              </div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>{totalPhotos}</span>
                <span className={styles.heroStatLabel}>Ảnh</span>
              </div>
            </div>
          )}
        </div>
      </section>


      {/* ── Grid ─────────────────────────────── */}
      <div className={styles.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--text-primary)", margin: 0, fontStyle: "italic" }}>Tất cả Album</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", color: "var(--text-secondary)" }}>Sắp xếp:</span>
            <SortDropdown />
          </div>
        </div>
        <div className={styles.grid}>
          {albums.map((album: any, idx: number) => {
            const count =
              (album._count?.photos ?? album.photos.length) +
              (album.children?.reduce(
                (s: number, c: any) =>
                  s + (c._count?.photos ?? (c.photos ? c.photos.length : 0)),
                0
              ) ?? 0);

            return (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className={styles.albumCard}
                style={{ animationDelay: `${idx * 0.07}s` }}
              >
                <div className={styles.albumStack}>
                  <div className={styles.albumStackLayer} />
                  <div className={styles.albumStackLayer} />
                  <div className={styles.albumStackLayer}>
                    <div className={styles.albumStackInner}>
                      {(() => {
                        const coverUrl = album.coverImage || (album.photos?.[0] || album.children?.find((c: any) => c.photos && c.photos.length > 0)?.photos?.[0])?.url;
                        return coverUrl ? (
                          coverUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                            <video
                              src={getOptimizedMediaUrl(coverUrl)}
                              className={styles.albumCoverImg}
                              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                            />
                          ) : (
                            <Image
                              src={coverUrl}
                              alt={album.name}
                              fill
                              className={styles.albumCoverImg}
                              sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 320px"
                            />
                          )
                      ) : (
                        <div className={styles.albumEmptyIcon}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                      );
                      })()}
                      <div className={styles.albumBadge}>{count} Ảnh</div>
                      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                        <DeleteAlbumButton id={album.id} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.albumInfo}>
                  <h3 className={styles.albumTitle}>{album.name}</h3>
                  <p className={styles.albumDesc}>
                    {album.description || "Chưa có mô tả cho album này."}
                  </p>
                  {album.children && album.children.length > 0 && (
                    <span className={styles.albumChildBadge}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      {album.children.length} thư mục con
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {/* Create album card */}
          <Link href="/upload" className={`${styles.albumCard} ${styles.createCard}`}>
            <div className={styles.albumStack}>
              <div className={styles.albumStackLayer} />
              <div className={styles.albumStackLayer} />
              <div className={styles.albumStackLayer}>
                <div className={styles.createIconWrapper}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <h3 className={styles.createLabel}>Tạo Album Mới</h3>
                <p className={styles.createSubLabel}>Bắt đầu một câu chuyện mới</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}

export default function AlbumsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  
  return (
    <main>
      <Suspense fallback={
        <>
          <section className={styles.hero} style={{ minHeight: '350px' }}>
            <div className={styles.heroContent}>
              <div className={styles.heroEyebrow}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Bộ sưu tập ký ức
              </div>
              <h1 className={styles.heroTitle}>Bộ sưu tập</h1>
              <p className={styles.heroSubtitle}>
                Những ngăn kéo lưu giữ ký ức, từng bức ảnh là một câu chuyện đang chờ được kể lại.
              </p>
              <div style={{ height: '56px' }}></div> {/* Spacer for where stats would be */}
            </div>
          </section>
          <div className={styles.container} style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <div className="vintage-spinner"></div>
            <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', color: 'var(--text-secondary)' }}>Đang soạn album...</p>
          </div>
        </>
      }>
        <AlbumsData searchParamsPromise={searchParams} />
      </Suspense>
    </main>
  );
}
