import { getDeletedPhotos, getDeletedAlbums, restorePhoto, restoreAlbum, hardDeletePhoto, hardDeleteAlbum, emptyTrash } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "../albums/page.module.css"; // Reuse album styles
import "./trash.css";

export default async function TrashPage() {
  const isAuth = await isAuthenticated();
  if (!isAuth) redirect("/login");

  const deletedPhotos = await getDeletedPhotos();
  const deletedAlbums = await getDeletedAlbums();

  return (
    <main className="container" style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            Thùng rác
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Các mục bị xóa sẽ nằm ở đây. Bạn có thể khôi phục hoặc xóa vĩnh viễn chúng.
          </p>
        </div>
        
        {(deletedPhotos.length > 0 || deletedAlbums.length > 0) && (
          <form action={emptyTrash}>
            <button 
              type="submit" 
              className="btn" 
              style={{ background: '#f44336', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Làm sạch thùng rác
            </button>
          </form>
        )}
      </header>

      {deletedAlbums.length === 0 && deletedPhotos.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <p>Thùng rác trống</p>
        </div>
      )}

      {/* Deleted Albums */}
      {deletedAlbums.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Albums Đã Xóa</h2>
          <div className={styles.grid}>
            {deletedAlbums.map((album: any) => (
              <div key={album.id} className={styles.albumCard} style={{ cursor: 'default' }}>
                <div className={styles.albumStack}>
                  <div className={styles.albumStackLayer}>
                    <div className={styles.albumStackInner} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className={styles.albumInfo}>
                  <h3 className={styles.albumTitle}>{album.name}</h3>
                  <p className={styles.albumDesc}>Bị xóa ngày: {album.deletedAt?.toLocaleDateString('vi-VN')}</p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <form action={async () => { "use server"; await restoreAlbum(album.id); }} style={{ flex: 1 }}>
                      <button className="btn" style={{ width: '100%', padding: '0.5rem', background: 'var(--accent-1)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Khôi phục
                      </button>
                    </form>
                    <form action={async () => { "use server"; await hardDeleteAlbum(album.id); }} style={{ flex: 1 }}>
                      <button className="btn" style={{ width: '100%', padding: '0.5rem', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Xóa hẳn
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Deleted Photos */}
      {deletedPhotos.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Ảnh Đã Xóa</h2>
          <div className="masonry-grid">
            {deletedPhotos.map((photo: any) => (
              <div key={photo.id} className="trash-photo-card" style={{ position: 'relative', breakInside: 'avoid', marginBottom: '1rem', borderRadius: '12px', overflow: 'hidden' }}>
                {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                  <video
                    src={getOptimizedMediaUrl(photo.url)}
                    style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.7 }}
                  />
                ) : (
                  <Image
                    src={photo.imageData || photo.url || ""}
                    alt={photo.altText}
                    width={300}
                    height={300}
                    style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.7 }}
                  />
                )}
                <div className="trash-photo-actions" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', gap: '1rem' }}>
                  <form action={async () => { "use server"; await restorePhoto(photo.id); }}>
                    <button className="btn" style={{ background: 'white', color: 'black', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Khôi phục
                    </button>
                  </form>
                  <form action={async () => { "use server"; await hardDeletePhoto(photo.id); }}>
                    <button className="btn" style={{ background: '#f44336', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Xóa vĩnh viễn
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
