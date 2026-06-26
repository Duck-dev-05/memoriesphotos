import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getStories } from "@/app/actions/story";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "../albums/page.module.css";
import { Suspense } from "react";
import { isAuthenticated } from "@/lib/auth";
import DeleteStoryButton from "./DeleteStoryButton";

export const metadata: Metadata = {
  title: "Câu Chuyện Của Chúng Mình — Kỷ Niệm",
  description: "Khám phá những câu chuyện và kỷ niệm đẹp nhất của chúng mình.",
};

async function StoriesData() {
  const [stories, isAuth] = await Promise.all([
    getStories(),
    isAuthenticated(),
  ]);

  const totalPhotos = stories.reduce((sum: number, s: any) => sum + (s._count?.photos ?? s.photos?.length ?? 0), 0);

  return (
    <>
      {/* ── Hero ─────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <polyline points="10 2 10 22" />
            </svg>
            Hành trình tình yêu
          </div>

          <h1 className={styles.heroTitle}>Câu Chuyện Của Chúng Mình</h1>

          <p className={styles.heroSubtitle}>
            Nơi lưu giữ từng nhịp đập, từng cái nắm tay và vô vàn những khoảnh khắc tuyệt vời mà đôi ta đã cùng nhau trải qua.
          </p>

          {stories.length > 0 && (
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>{stories.length}</span>
                <span className={styles.heroStatLabel}>Câu Chuyện</span>
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
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", color: "var(--text-primary)", margin: 0, fontStyle: "italic" }}>Nhật Ký</h2>
        </div>
        
        <div className={styles.grid}>
          {stories.map((story: any, idx: number) => {
            const count = story._count?.photos ?? story.photos?.length ?? 0;

            return (
              <Link
                key={story.id}
                href={`/about/${story.id}`}
                className={styles.albumCard}
                style={{ animationDelay: `${idx * 0.07}s` }}
              >
                <div className={styles.albumStack}>
                  <div className={styles.albumStackLayer} />
                  <div className={styles.albumStackLayer} />
                  <div className={styles.albumStackLayer}>
                    <div className={styles.albumStackInner}>
                      {(() => {
                        const coverUrl = story.coverImage || story.photos?.[0]?.url;
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
                              alt={story.title}
                              fill
                              className={styles.albumCoverImg}
                              sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 320px"
                            />
                          )
                        ) : (
                          <div className={styles.albumEmptyIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                              <polyline points="10 2 10 22" />
                            </svg>
                          </div>
                        );
                      })()}
                      <div className={styles.albumBadge}>{count} Ảnh</div>
                      {isAuth && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                          <DeleteStoryButton id={story.id} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.albumInfo}>
                  <h3 className={styles.albumTitle}>{story.title}</h3>
                  <p className={styles.albumDesc}>
                    {story.content || "Nhấn để đọc câu chuyện..."}
                  </p>
                </div>
              </Link>
            );
          })}

          {/* Create story card */}
          {isAuth && (
            <Link href="/about/new" className={`${styles.albumCard} ${styles.createCard}`}>
              <div className={styles.albumStack}>
                <div className={styles.albumStackLayer} />
                <div className={styles.albumStackLayer} />
                <div className={styles.albumStackLayer}>
                  <div className={styles.createIconWrapper}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </div>
                  <h3 className={styles.createLabel}>Viết Câu Chuyện</h3>
                  <p className={styles.createSubLabel}>Thêm một trang mới vào nhật ký</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export default function AboutPage() {
  return (
    <main>
      <Suspense fallback={
        <>
          <section className={styles.hero} style={{ minHeight: '350px' }}>
            <div className={styles.heroContent}>
              <div className={styles.heroEyebrow}>
                Hành trình tình yêu
              </div>
              <h1 className={styles.heroTitle}>Câu Chuyện Của Chúng Mình</h1>
              <p className={styles.heroSubtitle}>
                Nơi lưu giữ từng nhịp đập, từng cái nắm tay và vô vàn những khoảnh khắc tuyệt vời.
              </p>
            </div>
          </section>
          <div className={styles.container} style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <div className="vintage-spinner"></div>
            <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', color: 'var(--text-secondary)' }}>Đang tải nhật ký...</p>
          </div>
        </>
      }>
        <StoriesData />
      </Suspense>
    </main>
  );
}
