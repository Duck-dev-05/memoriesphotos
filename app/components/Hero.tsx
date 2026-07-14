import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "./Hero.module.css";

interface HeroPhoto {
  url?: string | null;
  imageData?: string | null;
}

interface HeroProps {
  heroPhotos: HeroPhoto[];
}

export default function Hero({ heroPhotos }: HeroProps) {
  // Ensure we have 4 items for the stack
  const stackItems = [...heroPhotos];
  while (stackItems.length < 4) {
    stackItems.push({ url: null, imageData: null });
  }

  return (
    <section className={styles.hero}>
      {/* Warm Vintage Glow */}
      <div className={styles.ambientGlow} />

      <div className={styles.container}>
        {/* Left: Typography */}
        <div className={styles.content}>
          <div className={styles.heroBadge}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg>
            Nhật Ký Kỷ Niệm
          </div>

          <h1 className={styles.heroTitle}>
            Lưu Giữ Những
            <span className={`${styles.heroTitleAccent} handwritten`} style={{ fontSize: '1.2em' }}>Trang Đời Đẹp Nhất</span>
          </h1>

          <p className={styles.heroDescription}>
            Một không gian riêng tư, hoài niệm để bạn nâng niu, cất giữ và
            sống lại những đoạn đường đã qua qua lăng kính thời gian.
          </p>

          <div className={styles.heroActions}>
            <Link href="/albums" className="btn btn-primary" style={{ padding: "1rem 2.5rem", fontSize: "1.1rem" }}>
              Lật Mở Kỷ Niệm
            </Link>
            <Link href="/upload" className="btn btn-secondary" style={{ padding: "1rem 2.5rem", fontSize: "1.1rem" }}>
              Thêm Trang Mới
            </Link>
          </div>
        </div>

        {/* Right: Interactive Polaroid Stack */}
        <div className={styles.stackContainer}>
          <div className={styles.photoStack}>
            {stackItems.slice(0, 4).map((photo: any, index: number) => {
              const src = photo.url || photo.imageData;
              const isVideo = src?.match(/\.(mp4|webm|ogg|mov)$/i);
              // Randomize tape rotation slightly for each card
              const tapeRot = (index % 2 === 0 ? -3 : 2) + Math.random() * 2 - 1;
              
              return (
                <div key={index} className={styles.stackCard}>
                  <div className="washi-tape" style={{ top: '-12px', left: '50%', marginLeft: '-40px', transform: `rotate(${tapeRot}deg)` }}></div>
                  <div className={styles.cardImageWrapper}>
                    {src ? (
                      isVideo ? (
                        <video 
                          src={getOptimizedMediaUrl(src)} 
                          className={styles.cardMedia}
                          autoPlay muted loop playsInline 
                        />
                      ) : (
                        <Image 
                          src={src} 
                          alt={`Hero photo ${index + 1}`} 
                          fill 
                          className={styles.cardMedia}
                          sizes="(max-width: 768px) 250px, 300px" 
                          priority={true}
                        />
                      )
                    ) : (
                      <div className={styles.emptyPlaceholder} />
                    )}
                  </div>
                  <div className={`${styles.cardCaption} handwritten`}>
                    {src ? `Khoảnh khắc ${index + 1}` : "Kỷ niệm chờ viết"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
