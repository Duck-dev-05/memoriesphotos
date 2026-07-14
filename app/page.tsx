import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getHomepagePhotos, getTotalPhotosCount, getAlbums, getMemories } from "@/app/actions";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "./page.module.css";
import Hero from "./components/Hero";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Trang chủ",
  description: "Chào mừng đến với Kỷ Niệm. Nơi lưu giữ những khoảnh khắc và kỷ niệm đẹp nhất của chúng ta.",
  openGraph: {
    title: "Trang chủ | Kỷ Niệm",
    description: "Chào mừng đến với Kỷ Niệm. Nơi lưu giữ những khoảnh khắc và kỷ niệm đẹp nhất của chúng ta.",
    url: "/",
  }
};

async function HomepageHero({ promise }: { promise: Promise<any> }) {
  const { heroPhotos } = await promise;
  return <Hero heroPhotos={heroPhotos} />;
}

async function HomepageMemories({ promise }: { promise: Promise<any> }) {
  const memories = await promise;
  if (!memories || memories.length === 0) return null;

  return (
    <section className={styles.memoriesStrip}>
      <div className={styles.memoriesHeader}>
        <div className={styles.memoriesEyebrow}>📅 Cùng Ngày Này Năm Xưa</div>
        <Link href="/memories" className={styles.memoriesSeeAll}>Xem tất cả →</Link>
      </div>
      <div className={styles.memoriesScroll}>
        {memories.slice(0, 12).map((photo: any) => {
          const src = photo.url || photo.imageData || "";
          const isVideo = src.match(/\.(mp4|webm|ogg|mov)$/i);
          const year = new Date(photo.dateTaken!).getFullYear();
          return (
            <Link key={photo.id} href={`/photo/${photo.id}`} className={styles.memoryCard}>
              <div className="washi-tape" style={{ top: '-12px', left: '50%', marginLeft: '-45px', transform: 'rotate(-2deg)' }}></div>
              <div className={styles.memoryImgWrap}>
                {isVideo ? (
                  <video src={getOptimizedMediaUrl(src)} className={styles.memoryImg} muted />
                ) : src ? (
                  <Image src={src} alt={photo.altText || "Memory"} fill className={styles.memoryImg} sizes="160px" />
                ) : null}
              </div>
              <span className={styles.memoryYear}>{year}</span>
              <div className={styles.memoryCaption}>{photo.altText}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

async function HomepageStats({
  photosPromise,
  albumsPromise,
  homepagePhotosPromise
}: {
  photosPromise: Promise<number>,
  albumsPromise: Promise<any[]>,
  homepagePhotosPromise: Promise<any>
}) {
  const [totalPhotosCount, albums, { favoritesCount }] = await Promise.all([
    photosPromise,
    albumsPromise,
    homepagePhotosPromise
  ]);

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statNum}>{totalPhotosCount}</span>
          <span className={styles.statLabel}>Khoảnh Khắc</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNum}>{albums.length}</span>
          <span className={styles.statLabel}>Chương Sách</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNum}>{favoritesCount}</span>
          <span className={styles.statLabel}>Yêu Thích</span>
        </div>
      </div>
    </div>
  );
}

async function HomepageMarquee({ promise }: { promise: Promise<any> }) {
  const { marqueePhotos } = await promise;
  if (!marqueePhotos || marqueePhotos.length <= 3) return null;

  return (
    <section className={styles.marqueeSection}>
      <div className={styles.marqueeTrack}>
        {/* Double the array for infinite scroll effect */}
        {[...marqueePhotos, ...marqueePhotos].map((photo: any, i: number) => {
          const src = photo.url || photo.imageData;
          if (!src) return null;
          const isVideo = src.match(/\.(mp4|webm|ogg|mov)$/i);
          const rot = Math.floor(Math.random() * 10) - 5; 
          
          return (
            <div key={`${photo.id}-${i}`} className={styles.marqueeItem} style={{ transform: `rotate(${rot}deg)` }}>
              <div className="washi-tape" style={{ top: '-10px', left: '50%', marginLeft: '-40px' }}></div>
              <div className={styles.marqueeImageWrapper}>
                {isVideo ? (
                  <video src={getOptimizedMediaUrl(src)} className={styles.marqueeMedia} />
                ) : (
                  <Image
                    src={src}
                    alt="Memory"
                    fill
                    className={styles.marqueeMedia}
                    sizes="250px"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

async function HomepageSpotlight({ promise }: { promise: Promise<any> }) {
  const { randomPhoto } = await promise;
  if (!randomPhoto) return null;

  return (
    <section className={styles.spotlightSection}>
      <div className={styles.spotlightBackground}>
        {(() => {
          const src = randomPhoto.url || randomPhoto.imageData;
          if (!src) return null;
          if (src.match(/\.(mp4|webm|ogg|mov)$/i)) {
            return <video src={getOptimizedMediaUrl(src)} className={styles.spotlightBgMedia} autoPlay muted loop playsInline />;
          }
          return <Image src={src} alt="Background" fill className={styles.spotlightBgMedia} priority sizes="100vw" />;
        })()}
        <div className={styles.spotlightOverlay} />
      </div>

      <div className={styles.spotlightContent}>
        <div className={styles.spotlightTextSide}>
          <div className={styles.spotlightBadge}>
            Tiêu Điểm Kỷ Niệm
          </div>
          <Link href={`/photo/${randomPhoto.id}`} className="sticky-note" style={{ maxWidth: '400px', transform: 'rotate(-2deg)', display: 'block', textDecoration: 'none', color: '#2a2020', fontSize: '2rem' }}>
            &ldquo;{randomPhoto.altText || "Một khoảnh khắc đáng nhớ, được lưu giữ mãi mãi."}&rdquo;
          </Link>
        </div>

        <Link href={`/photo/${randomPhoto.id}`} className={styles.spotlightFrame} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
          <div className="washi-tape" style={{ top: '-15px', right: '-10px', transform: 'rotate(45deg)' }}></div>
          <div className="washi-tape" style={{ bottom: '-15px', left: '-10px', transform: 'rotate(45deg)' }}></div>
          <div className={styles.spotlightImageWrapper}>
            {(() => {
              const src = randomPhoto.url || randomPhoto.imageData;
              if (!src) return null;
              if (src.match(/\.(mp4|webm|ogg|mov)$/i)) {
                return <video src={getOptimizedMediaUrl(src)} className={styles.spotlightMedia} autoPlay muted loop playsInline controls />;
              }
              return <Image src={src} alt={randomPhoto.altText || "Kỷ niệm"} fill className={styles.spotlightMedia} priority sizes="(max-width: 768px) 100vw, 50vw" />;
            })()}
          </div>
          <div className={`${styles.spotlightFrameCaption} handwritten`} style={{ fontSize: '2.5rem', textAlign: 'center', padding: '0 1rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {randomPhoto.dateTaken ? new Date(randomPhoto.dateTaken).toLocaleDateString('vi-VN') : "Kỷ niệm quý giá"}
          </div>
        </Link>
      </div>
    </section>
  );
}

async function HomepageAlbums({ promise }: { promise: Promise<any[]> }) {
  const albums = await promise;
  const featuredAlbums = albums.slice(0, 6);
  if (featuredAlbums.length === 0) return null;

  return (
    <section className={styles.albumsSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Các Chương Sách Nổi Bật</h2>
        <p className={styles.sectionSubtitle}>
          Cuộc đời là một cuốn sách, và đây là những chương tuyệt vời nhất mà bạn đã viết lên.
        </p>
      </div>

      <div className={styles.expandingGallery}>
        {featuredAlbums.map((album: any) => {
          const coverUrl = album.coverImage || album.photos[0]?.imageData || album.photos[0]?.url || album.children?.find((c: any) => c.photos && c.photos.length > 0)?.photos?.[0]?.url;
          const photoCount = 
            (album._count?.photos ?? album.photos.length) + 
            (album.children?.reduce((sum: number, c: any) => sum + (c._count?.photos ?? c.photos?.length ?? 0), 0) ?? 0);

          return (
            <Link href={`/albums/${album.id}`} key={album.id} className={styles.expandCard}>
              {coverUrl ? (
                coverUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                  <video src={getOptimizedMediaUrl(coverUrl)} className={styles.expandMedia} autoPlay muted loop playsInline />
                ) : (
                  <Image src={coverUrl} alt={album.name} fill className={styles.expandMedia} sizes="(max-width: 1200px) 100vw, 800px" style={{ objectFit: 'cover' }} />
                )
              ) : (
                <div className={styles.expandMedia} style={{ background: 'var(--bg-secondary)' }} />
              )}

              <div className={styles.expandOverlay}>
                <div className={styles.expandTitleVertical}>{album.name}</div>
                
                <div className={styles.expandContent}>
                  {photoCount > 0 && (
                    <div className={styles.expandCount}>{photoCount} ảnh</div>
                  )}
                  <h3 className={styles.expandTitle}>{album.name}</h3>
                  <p className={styles.expandDesc}>
                    {album.description || "Chưa có mô tả cho chương này."}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  // Fetch data exactly once at the top level
  const homepagePhotosPromise = getHomepagePhotos();
  const memoriesPromise = getMemories();
  const albumsPromise = getAlbums();
  const totalPhotosPromise = getTotalPhotosCount();

  return (
    <main className={styles.pageContainer}>
      <Suspense fallback={<Hero heroPhotos={[]} />}>
        <HomepageHero promise={homepagePhotosPromise} />
      </Suspense>

      <Suspense fallback={<div className="vintage-spinner" style={{ margin: '4rem auto' }} />}>
        <HomepageMemories promise={memoriesPromise} />
      </Suspense>

      <Suspense fallback={<div className="vintage-spinner" style={{ margin: '2rem auto' }} />}>
        <HomepageStats 
          photosPromise={totalPhotosPromise}
          albumsPromise={albumsPromise}
          homepagePhotosPromise={homepagePhotosPromise}
        />
      </Suspense>

      <Suspense fallback={null}>
        <HomepageMarquee promise={homepagePhotosPromise} />
      </Suspense>

      <Suspense fallback={null}>
        <HomepageSpotlight promise={homepagePhotosPromise} />
      </Suspense>

      <Suspense fallback={<div className="vintage-spinner" style={{ margin: '4rem auto' }} />}>
        <HomepageAlbums promise={albumsPromise} />
      </Suspense>

      <section className={styles.ctaSection}>
        <Link href="/albums" className={styles.btnOutline}>
          Khám Phá Tất Cả Kỷ Niệm
        </Link>
      </section>
    </main>
  );
}
