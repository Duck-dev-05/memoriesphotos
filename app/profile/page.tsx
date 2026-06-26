import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "./page.module.css";
import { logout } from "@/app/actions";

export const metadata = {
  title: "Hồ sơ của tôi | Kỷ Niệm",
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      _count: {
        select: {
          photos: { where: { deletedAt: null } },
          albums: { where: { deletedAt: null } },
        },
      },
      photos: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      albums: {
        where: { deletedAt: null, parentId: null },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          photos: { where: { deletedAt: null }, take: 1, orderBy: { createdAt: "desc" } },
          _count: { select: { photos: { where: { deletedAt: null } } } },
          children: {
            where: { deletedAt: null },
            include: {
              _count: { select: { photos: { where: { deletedAt: null } } } },
              photos: { where: { deletedAt: null }, take: 1 }
            }
          }
        },
      },
    },
  });

  const favoritesCount = await prisma.photo.count({
    where: { userId: session.userId, isFavorite: true, deletedAt: null },
  });

  if (!user) redirect("/login");

  return (
    <main className={styles.profileContainer}>
      {/* Animated background orbs */}
      <div className={styles.animatedBackground} aria-hidden="true">
        <div className={`${styles.orb} ${styles.orb1}`}></div>
        <div className={`${styles.orb} ${styles.orb2}`}></div>
      </div>

      <div className={styles.pageLayout}>
        {/* ─── Profile Hero ─── */}
        <section className={styles.profileHeader}>
          {/* Banner */}
          <div className={styles.profileBanner}>
            <div className={styles.bannerShimmer}></div>
          </div>

          {/* Avatar */}
          <div className={styles.avatarWrapper}>
            <div className={styles.authorAvatar}>
              <div className={styles.authorAvatarInner}>
                {user.image ? (
                  <Image src={user.image} alt={user.name} fill style={{ objectFit: "cover" }} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Info */}
          <h1 className={styles.authorName}>{user.name}</h1>
          <p className={styles.authorEmail}>{user.email}</p>
          <p className={styles.authorSince}>
            Thành viên từ {new Date(user.createdAt).toLocaleDateString("vi-VN")}
          </p>

          {/* Actions */}
          <div className={styles.headerActions}>
            <Link href="/settings" className={styles.editButton}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              Chỉnh sửa thông tin
            </Link>
            <form action={logout}>
              <button type="submit" className={styles.logoutButton}>
                Đăng xuất
              </button>
            </form>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{user._count.photos}</span>
              <span className={styles.statLabel}>Khoảnh khắc</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{user._count.albums}</span>
              <span className={styles.statLabel}>Bộ sưu tập</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{favoritesCount}</span>
              <span className={styles.statLabel}>Yêu thích</span>
            </div>
          </div>
        </section>

        {/* ─── Content ─── */}
        <div className={styles.content}>
          {/* Recent Photos */}
          {user.photos.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Khoảnh khắc gần đây</h2>
                <Link href="/timeline" className={styles.sectionLink}>Xem tất cả ảnh</Link>
              </div>
              <div className={styles.photoGrid}>
                {user.photos.map((photo: any, i: number) => (
                  <Link
                    href={`/photo/${photo.id}`}
                    key={photo.id}
                    className={styles.photoCard}
                  >
                    {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video
                        src={getOptimizedMediaUrl(photo.url)}
                        style={{ objectFit: "cover", width: "100%", height: "100%" }}
                      />
                    ) : (
                      <Image
                        src={photo.url || photo.imageData || ""}
                        alt={photo.altText}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    )}
                    <div className={styles.photoCardOverlay}>
                      <span className={styles.photoCardLabel}>{photo.altText}</span>
                      {photo.dateTaken && (
                        <span className={styles.photoCardDate}>
                          {new Date(photo.dateTaken).getFullYear()}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {user.albums.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Bộ sưu tập nổi bật</h2>
                <Link href="/albums" className={styles.sectionLink}>Xem tất cả album</Link>
              </div>
              <div className={styles.albumGrid}>
                {user.albums.map((album, i) => {
                  const coverUrl = album.coverImage || (album.photos[0] || album.children?.find(c => c.photos?.length > 0)?.photos[0])?.url;
                  const totalCount = album._count.photos + (album.children?.reduce((sum, c) => sum + c._count.photos, 0) || 0);
                  return (
                    <Link
                      href={`/albums/${album.id}`}
                      key={album.id}
                      className={styles.albumCard}
                    >
                      <div className={styles.albumCover}>
                        {coverUrl ? (
                          coverUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                            <video
                              src={getOptimizedMediaUrl(coverUrl)}
                              style={{ objectFit: "cover", width: "100%", height: "100%" }}
                            />
                          ) : (
                            <Image
                              src={coverUrl}
                              alt={album.name}
                              fill
                              style={{ objectFit: "cover" }}
                            />
                          )
                        ) : (
                          <div className={styles.albumCoverEmpty}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className={styles.albumBadge}>{totalCount} ảnh</div>
                      </div>
                      <div className={styles.albumFooter}>
                        <span className={styles.albumName}>{album.name}</span>
                        <div className={styles.albumArrow}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty state */}
          {user.photos.length === 0 && user.albums.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📷</span>
              <p className={styles.emptyText}>Chưa có kỷ niệm nào. Hãy bắt đầu lưu giữ!</p>
              <Link href="/" className={styles.emptyAction}>Tải ảnh đầu tiên lên</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
