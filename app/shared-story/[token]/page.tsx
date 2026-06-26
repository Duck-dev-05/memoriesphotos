import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getPublicStory } from "@/app/actions/story";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "../../albums/[id]/page.module.css";
import GuestUploadButton from "./GuestUploadButton";

export default async function SharedStoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const story = await getPublicStory(token);
  const session = await getSession();

  if (!story) notFound();

  // Cover photos for the banner collage (up to 3)
  let coverPhotos: any[] = [];
  if (story.coverImage) {
    coverPhotos = [{ url: story.coverImage, id: "cover" }];
  } else {
    coverPhotos = story.photos.slice(0, 3);
  }

  const photosInStory = story.photos.length;

  return (
    <div className={styles.page}>
      <header className={styles.albumBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerBreadcrumb}>
            <span style={{ color: "var(--accent-1)", fontWeight: "bold" }}>Nhật Ký Được Chia Sẻ</span>
          </div>

          <h1 className={styles.bannerTitle}>{story.title}</h1>

          {story.content && (
            <p className={styles.bannerDesc} style={{ whiteSpace: "pre-wrap", fontSize: "1.1rem", lineHeight: "1.8" }}>{story.content}</p>
          )}

          <div className={styles.bannerMeta}>
            <span className={styles.bannerChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Bởi: {story.user?.name || "Người dùng ẩn danh"}
            </span>
            <span className={styles.bannerChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {photosInStory} ảnh
            </span>
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
                      alt={story.title}
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

      {story.photos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
          Câu chuyện này hiện chưa có ảnh nào.
        </div>
      ) : (
        <div className={styles.masonryGallery}>
          {story.photos.map((photo: any, idx: number) => (
            <Link
              key={photo.id}
              href={`/photo/${photo.id}?shared=${token}`}
              className={styles.photoTile}
              style={{ animationDelay: `${idx * 0.035}s` }}
            >
              <div className={styles.photoTileInner}>
                {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                  <video
                    src={getOptimizedMediaUrl(photo.url)}
                    className={styles.photoTileImg}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                ) : (
                  <Image
                    src={photo.imageData || photo.url || ""}
                    alt={photo.altText || "Ảnh"}
                    fill
                    priority={idx < 8}
                    className={styles.photoTileImg}
                    sizes="(max-width: 480px) 50vw, (max-width: 800px) 33vw, (max-width: 1200px) 25vw, 320px"
                  />
                )}
                <div className={styles.photoTileOverlay} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {story.isCollaborative && (
        <GuestUploadButton token={token} isLoggedIn={!!session} />
      )}
    </div>
  );
}
