import Image from "next/image";
import Link from "next/link";
import { getPhoto, getPublicPhoto, deletePhoto, toggleFavorite, getAlbums, getAdjacentPhotos } from "@/app/actions";
import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import EditPhotoForm from "./EditPhotoForm";
import PhotoNavigator from "./components/PhotoNavigator";
import EditorButton from "./EditorButton";
import PhotoShareButton from "./PhotoShareButton";
import { getOptimizedMediaUrl } from "@/lib/media";

export default async function PhotoDetail({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params;
  const { shared: sharedToken } = await searchParams;

  let photo = null;
  if (sharedToken && typeof sharedToken === 'string') {
    photo = await getPublicPhoto(id, sharedToken);
  } else {
    photo = await getPhoto(id);
  }

  const isAuth = await isAuthenticated();
  const albums = isAuth ? await getAlbums() : [];
  
  // getAdjacentPhotos requires auth, so only fetch if authenticated for now,
  // or modify getAdjacentPhotos to support sharedTokens. Let's just pass null for guest to hide navigator arrows.
  let prevId = null;
  let nextId = null;
  if (isAuth || !sharedToken) {
    try {
      const adjacent = await getAdjacentPhotos(id, photo?.albumId || null);
      prevId = adjacent.prevId;
      nextId = adjacent.nextId;
    } catch(e) {}
  }

  if (!photo) {
    notFound();
  }

  async function handleDelete() {
    "use server";
    await deletePhoto(id);
    redirect("/");
  }

  async function handleToggleFavorite() {
    "use server";
    await toggleFavorite(id, !photo!.isFavorite);
  }

  return (
    <main className="container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "4rem 2rem" }}>
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1000px", margin: "0 auto 2rem", width: "100%" }}>
        <Link href={photo.albumId ? `/albums/${photo.albumId}` : "/"} className="btn btn-secondary">
          &larr; Trở lại bộ sưu tập
        </Link>
        
        {isAuth && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <PhotoShareButton photoId={photo.id} existingToken={photo.shareToken} />
            <EditorButton photoId={photo.id} imageUrl={photo.url || ""} />
            <form action={handleToggleFavorite}>
              <button type="submit" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: photo.isFavorite ? "var(--accent-1)" : "inherit" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={photo.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                {photo.isFavorite ? "Đã thích" : "Yêu thích"}
              </button>
            </form>
            <form action={handleDelete}>
              <button type="submit" className="btn" style={{ borderColor: "var(--accent-1)", color: "var(--accent-1)" }}>
                Xóa
              </button>
            </form>
          </div>
        )}
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 auto", width: "100%", maxWidth: "1000px" }}>
        <PhotoNavigator prevId={prevId} nextId={nextId} albumId={photo.albumId}>
          <div className="polaroid-card" style={{ padding: "1.5rem 1.5rem 4rem 1.5rem", width: "100%", transform: "rotate(1deg)" }}>
            <div style={{ position: "relative", width: "100%", paddingBottom: "75%", backgroundColor: "var(--bg-secondary)", border: "1px solid rgba(0,0,0,0.1)" }}>
              {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                <video 
                  src={getOptimizedMediaUrl(photo.url)} 
                  controls 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: "contain", filter: "sepia(0.2) contrast(1.05)" }} 
                />
              ) : (
                <Image
                  src={photo.imageData || photo.url || ""}
                  alt={photo.altText}
                  fill
                  style={{ objectFit: "contain", filter: "sepia(0.2) contrast(1.05)" }}
                />
              )}
            </div>
            <div style={{ padding: "2rem 1rem 0", textAlign: "center" }}>
              {isAuth ? (
                <EditPhotoForm 
                  photo={{ 
                    id: photo.id, 
                    altText: photo.altText, 
                    description: photo.description, 
                    albumId: photo.albumId,
                    tags: photo.tags?.map((t: any) => t.name).join(", ") || ""
                  }} 
                  albums={albums}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "2.5rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
                    {photo.altText}
                  </h1>
                  {photo.description && (
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.2rem", lineHeight: 1.6, marginBottom: "2rem", maxWidth: "600px", margin: "0 auto 2rem", whiteSpace: "pre-wrap" }}>
                      {photo.description}
                    </p>
                  )}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", gap: "2rem", color: "var(--text-secondary)", fontSize: "1rem", borderTop: "1px dashed rgba(59,47,47,0.2)", paddingTop: "1.5rem", maxWidth: "400px", margin: "0 auto" }}>
                <span>Đã tải lên: {photo.createdAt.toLocaleDateString()}</span>
                {photo.dateTaken && <span>Chụp lúc: {photo.dateTaken.toLocaleDateString()}</span>}
                {photo.album && (
                  <span>Album: <Link href={`/albums/${photo.album.id}`} style={{ color: "var(--accent-1)", fontStyle: "italic" }}>{photo.album.name}</Link></span>
                )}
              </div>

              {/* EXIF Data Section */}
              {(photo.cameraMake || photo.cameraModel || photo.fNumber || photo.exposureTime || photo.iso || photo.focalLength) && (
                <div style={{ marginTop: "2rem", background: "rgba(0,0,0,0.02)", borderRadius: "16px", padding: "1.5rem", border: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", maxWidth: "500px", margin: "2rem auto 0" }}>
                  
                  {/* Camera / Lens */}
                  {(photo.cameraMake || photo.cameraModel) && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "var(--text-primary)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-1)" }}>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
                      </svg>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                          {`${photo.cameraMake || ''} ${photo.cameraModel || ''}`.trim()}
                        </div>
                        {photo.lensModel && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{photo.lensModel}</div>}
                      </div>
                    </div>
                  )}

                  {/* Settings Grid */}
                  <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                    {photo.focalLength && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Tiêu cự</div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{photo.focalLength}mm</div>
                      </div>
                    )}
                    {photo.fNumber && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Khẩu độ</div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>f/{photo.fNumber}</div>
                      </div>
                    )}
                    {photo.exposureTime && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Tốc độ</div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{photo.exposureTime}s</div>
                      </div>
                    )}
                    {photo.iso && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>ISO</div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{photo.iso}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {photo.tags && photo.tags.length > 0 && (
                <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
                  {photo.tags.map((tag: any) => (
                    <Link key={tag.id} href={`/search?q=${encodeURIComponent(tag.name)}`} style={{ 
                      backgroundColor: "rgba(201,122,126,0.15)", 
                      color: "var(--accent-1)", 
                      padding: "0.3rem 0.8rem", 
                      borderRadius: "20px", 
                      fontSize: "0.85rem",
                      textDecoration: "none",
                      fontWeight: 500,
                      transition: "all 0.2s"
                    }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(201,122,126,0.3)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(201,122,126,0.15)'}>
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}
              
            </div>
          </div>
        </PhotoNavigator>
      </div>
    </main>
  );
}
