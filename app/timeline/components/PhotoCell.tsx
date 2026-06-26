import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";

interface PhotoCellProps {
  photo: any;
  index: number;
  showDate?: boolean;
}

export function PhotoCell({ photo, index, showDate = true }: PhotoCellProps) {
  const src = photo.imageData || photo.url || "";
  const isVideo = src?.match(/\.(mp4|webm|ogg|mov)$/i);

  return (
    <Link
      key={photo.id}
      href={`/photo/${photo.id}`}
      className="tl-photo-cell"
      aria-label={photo.altText || `Ảnh ${index + 1}`}
    >
      <div className="tl-photo-img-wrapper">
        {isVideo ? (
          <video src={getOptimizedMediaUrl(src)} className="tl-photo-img" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        ) : (
          <Image
            src={src}
            alt={photo.altText || ""}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="tl-photo-img"
          />
        )}
      </div>
      <div className="tl-photo-caption">
        {photo.altText && photo.altText !== photo.url
          ? photo.altText
          : photo.locationName
          ? photo.locationName
          : showDate && photo.dateTaken
          ? new Date(photo.dateTaken).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
          : "Không có ngày chụp"}
      </div>
      <div className="tl-select-btn" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="tl-photo-shimmer" aria-hidden="true" />
    </Link>
  );
}
