import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getAlbum, getAlbums, deleteAlbum } from "@/app/actions";
import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getOptimizedMediaUrl } from "@/lib/media";
import DeleteAlbumButton from "../DeleteAlbumButton";
import styles from "./page.module.css";
import SmartFilterGrid from "./SmartFilterGrid";
import EditAlbumModal from "./EditAlbumModal";
import ShareButton from "./ShareButton";

export default async function AlbumDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const [album, albums, isAuth] = await Promise.all([
    getAlbum(id),
    getAlbums(),
    isAuthenticated(),
  ]);


  if (!album) notFound();

  async function handleDelete() {
    "use server";
    await deleteAlbum(id);
    redirect("/albums");
  }

  // Determine if this album is a child of another
  const parentAlbum = albums.find((a: any) => a.children?.some((c: any) => c.id === id));

  // Photo count helpers
  const photosInAlbum = album.photos.length;
  const childrenPhotoCount =
    album.children?.reduce(
      (sum: number, c: any) => sum + (c._count?.photos ?? c.photos?.length ?? 0),
      0
    ) ?? 0;
  const totalPhotos = photosInAlbum + childrenPhotoCount;

  // Only show photos directly in this album (do not aggregate from children)
  const allPhotosMap = new Map<string, any>();
  album.photos.forEach((p: any) => allPhotosMap.set(p.id, p));
  const allPhotos = Array.from(allPhotosMap.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Cover photos for the banner collage (up to 3)
  let coverPhotos: any[] = [];
  if (album.coverImage) {
    coverPhotos = [{ url: album.coverImage, id: "cover" }];
  } else {
    coverPhotos = album.photos.slice(0, 3);
    // If fewer than 3 in this album, pad with child album cover photos
    if (coverPhotos.length < 3 && album.children) {
      for (const child of album.children) {
        if (coverPhotos.length >= 3) break;
        if (child.photos && child.photos.length > 0) {
          coverPhotos.push(child.photos[0]);
        }
      }
    }
  }

  // Aggregate unique tags from all photos in this album
  const tagCounts = new Map<string, number>();
  album.photos.forEach((photo: any) => {
    if (photo.tags) {
      photo.tags.forEach((tag: any) => {
        tagCounts.set(tag.name, (tagCounts.get(tag.name) || 0) + 1);
      });
    }
  });
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);

  return (
    <div className={styles.page}>
      {/* ── Top Rail ──────────────────────────── */}
      <nav className={styles.topRail} aria-label="Albums navigation">
        {albums.map((a: any, idx: number) => {
          const isActive = a.id === id;
          const count =
            (a._count?.photos ?? a.photos.length) +
            (a.children?.reduce(
              (s: number, c: any) =>
                s + (c._count?.photos ?? (c.photos ? c.photos.length : 0)),
              0
            ) ?? 0);
          return (
            <React.Fragment key={`group-${a.id}`}>
              {idx > 0 && <div className={styles.topRailDivider} />}
              <Link
                href={`/albums/${a.id}`}
                className={`${styles.topRailItem} ${isActive ? styles.topRailItemActive : ""}`}
              >
                {a.name}
                <span className={styles.topRailCount}>{count}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Sub-rail: show sibling child albums when viewing a child */}
      {parentAlbum && parentAlbum.children && parentAlbum.children.length > 1 && (
        <nav className={styles.subRail} aria-label="Child albums">
          <span className={styles.subRailLabel}>{parentAlbum.name} ›</span>
          {parentAlbum.children.map((c: any) => (
            <Link
              key={c.id}
              href={`/albums/${c.id}`}
              className={`${styles.subRailItem} ${c.id === id ? styles.subRailItemActive : ""}`}
            >
              {c.name}
              <span className={styles.topRailCount}>
                {c._count?.photos ?? (c.photos ? c.photos.length : 0)}
              </span>
            </Link>
          ))}
        </nav>
      )}

      {/* ── Main ─────────────── */}
      <>
        {/* ── Banner Hero ───────────────────── */}
        <header className={styles.albumBanner}>
          <div className={styles.bannerLeft}>
            {/* Breadcrumb */}
            <div className={styles.bannerBreadcrumb}>
              <Link href="/albums">Albums</Link>
              {parentAlbum && (
                <>
                  <span className={styles.bannerSep}>›</span>
                  <Link href={`/albums/${parentAlbum.id}`}>{parentAlbum.name}</Link>
                </>
              )}
              <span className={styles.bannerSep}>›</span>
              <span>{album.name}</span>
            </div>

            <h1 className={styles.bannerTitle}>{album.name}</h1>

            {album.description && (
              <p className={styles.bannerDesc}>{album.description}</p>
            )}

            <div className={styles.bannerMeta}>
              <span className={styles.bannerChip}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                {photosInAlbum} ảnh
              </span>
              {album.children && album.children.length > 0 && (
                <span className={styles.bannerChip}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  {album.children.length} thư mục con
                </span>
              )}
              {totalPhotos > photosInAlbum && (
                <span className={styles.bannerChip}>
                  {totalPhotos} ảnh tổng cộng
                </span>
              )}
              {topTags.length > 0 && (
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginLeft: "0.5rem", borderLeft: "1px solid rgba(0,0,0,0.1)", paddingLeft: "1rem" }}>
                  {topTags.map(tag => (
                    <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className={styles.bannerChip} style={{ textDecoration: "none", color: "var(--accent-1)" }}>
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cover collage */}
          {coverPhotos.length > 0 && (
            <div className={styles.bannerRight}>
              <div className={styles.coverCollage}>
                {coverPhotos.map((photo: any, i: number) => (
                  <div key={photo.id || i} className={styles.coverPhoto}>
                    {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video
                        src={getOptimizedMediaUrl(photo.url)}
                        style={{ objectFit: "cover", width: "100%", height: "100%" }}
                      />
                    ) : (
                      <Image
                        src={photo.imageData || photo.url || ""}
                        alt={album.name}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="160px"
                        priority={i === 0}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* ── Sub-Albums Horizontal Row ──────── */}
        {album.children && album.children.length > 0 && (
          <section className={styles.subAlbumsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Thư mục con</h2>
              <div className={styles.sectionLine} />
              <span className={styles.sectionCount}>{album.children.length} album</span>
            </div>

            <div className={styles.subAlbumsScroll}>
              {[...album.children].sort((a, b) => a.name.localeCompare(b.name)).map((child: any, idx: number) => (
                <Link
                  key={child.id}
                  href={`/albums/${child.id}`}
                  className={styles.subAlbumCard}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div className={styles.albumStack}>
                    <div className={styles.albumStackInner}>
                      {child.photos && child.photos.length > 0 ? (
                        child.photos[0].url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                          <video
                            src={getOptimizedMediaUrl(child.photos[0].url)}
                            className={styles.albumCoverImg}
                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                          />
                        ) : (
                          <Image
                            src={child.photos[0].imageData || child.photos[0].url || ""}
                            alt={child.name}
                            fill
                            className={styles.albumCoverImg}
                            sizes="150px"
                          />
                        )
                      ) : (
                        <div className={styles.albumEmptyIcon}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                      )}
                      <div className={styles.albumBadge}>
                        {child._count?.photos ?? (child.photos ? child.photos.length : 0)} Ảnh
                      </div>
                      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                        <DeleteAlbumButton id={child.id} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.albumCardInfo}>
                    <h3 className={styles.albumCardTitle}>{child.name}</h3>
                    {child.description && (
                      <p className={styles.albumCardDesc}>{child.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Photos section header ─────────── */}
        {allPhotos.length > 0 && (
          <div className={styles.photosSectionHeader}>
            <h2 className={styles.sectionTitle}>
              Tất Cả Ảnh
            </h2>
            <div className={styles.sectionLine} />
            <span className={styles.sectionCount}>{allPhotos.length} ảnh</span>
          </div>
        )}

        {/* ── Masonry Gallery with Smart Filtering ───────────────────── */}
        {allPhotos.length > 0 && (
          <SmartFilterGrid photos={allPhotos} albumId={album.id} isAuth={isAuth} />
        )}
      </>

      {/* ── Floating Action Buttons (auth only) ── */}
      {isAuth && (
        <div className={styles.fab}>
          <ShareButton albumId={album.id} existingToken={album.shareToken} isCollaborative={album.isCollaborative} />
          <EditAlbumModal album={album} />
          <form action={handleDelete} style={{ margin: 0 }}>
            <button type="submit" className={`${styles.fabBtn} ${styles.fabDelete}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Xóa Album
            </button>
          </form>
          <label htmlFor="album-upload-input" className={`${styles.fabBtn} ${styles.fabAdd}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Thêm Ảnh
          </label>
        </div>
      )}
    </div>
  );
}
