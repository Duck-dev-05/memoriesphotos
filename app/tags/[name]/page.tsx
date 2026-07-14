import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getPhotosByTag } from "@/app/actions";
import { notFound } from "next/navigation";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "../../albums/[id]/page.module.css";

export default async function TagDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const photos = await getPhotosByTag(decodedName);

  if (!photos || photos.length === 0) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <header className={styles.albumBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerBreadcrumb}>
            <Link href="/tags">Tags</Link>
            <span className={styles.bannerSep}>›</span>
            <span>#{decodedName}</span>
          </div>

          <h1 className={styles.bannerTitle}>#{decodedName}</h1>

          <div className={styles.bannerMeta}>
            <span className={styles.bannerChip}>
              {photos.length} ảnh
            </span>
          </div>
        </div>
      </header>

      <div className={styles.masonryGallery}>
        {photos.map((photo: any, idx: number) => (
          <Link
            key={photo.id}
            href={`/photo/${photo.id}`}
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
                  className={styles.photoTileImg}
                  sizes="(max-width: 480px) 50vw, (max-width: 800px) 33vw, (max-width: 1200px) 25vw, 320px"
                />
              )}
              <div className={styles.photoTileOverlay} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
