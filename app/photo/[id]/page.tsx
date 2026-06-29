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
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: "#000", display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
      
      {/* Top action bar - Fixed overlay */}
      <div style={{ position: "sticky", top: 0, left: 0, right: 0, zIndex: 110, padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)", color: "white" }}>
        <Link href={photo.albumId ? `/albums/${photo.albumId}` : "/"} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "20px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Đóng
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
              <button type="submit" className="btn" style={{ borderColor: "var(--accent-1)", color: "var(--accent-1)", background: "rgba(255,255,255,0.1)" }}>
                Xóa
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main Photo Viewport - full viewport height minus top bar roughly */}
      <div style={{ position: "relative", width: "100%", height: "100vh", flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", marginTop: "-70px" }}>
        <PhotoNavigator prevId={prevId} nextId={nextId} albumId={photo.albumId}>
          <div style={{ position: "relative", width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
              <video 
                src={getOptimizedMediaUrl(photo.url)} 
                controls 
                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: "contain" }} 
              />
            ) : (
              <Image
                src={photo.imageData || photo.url || ""}
                alt={photo.altText}
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            )}
          </div>
        </PhotoNavigator>
      </div>

      {/* Info Section Below */}
      <div style={{ backgroundColor: "#1e1e1e", color: "#eee", padding: "4rem 2rem", flexGrow: 1 }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          <div style={{ textAlign: "center" }}>
            {isAuth ? (
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "2rem", borderRadius: "12px" }}>
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
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h1 style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "2.5rem", marginBottom: "1rem", color: "#fff" }}>
                  {photo.altText}
                </h1>
                {photo.description && (
                  <p style={{ color: "#aaa", fontSize: "1.2rem", lineHeight: 1.6, marginBottom: "2rem", maxWidth: "600px", margin: "0 auto 2rem", whiteSpace: "pre-wrap" }}>
                    {photo.description}
                  </p>
                )}
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "center", gap: "2rem", color: "#888", fontSize: "1rem", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "1.5rem", marginTop: "2rem" }}>
              <span>Đã tải lên: {photo.createdAt.toLocaleDateString()}</span>
              {photo.dateTaken && <span>Chụp lúc: {photo.dateTaken.toLocaleDateString()}</span>}
              {photo.album && (
                <span>Album: <Link href={`/albums/${photo.album.id}`} style={{ color: "var(--accent-1)", fontStyle: "italic" }}>{photo.album.name}</Link></span>
              )}
            </div>
          </div>

          {/* EXIF Data Section */}
          {(photo.cameraMake || photo.cameraModel || photo.fNumber || photo.exposureTime || photo.iso || photo.focalLength) && (
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              
              {/* Camera / Lens */}
              {(photo.cameraMake || photo.cameraModel) && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#fff" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-1)" }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                      {`${photo.cameraMake || ''} ${photo.cameraModel || ''}`.trim()}
                    </div>
                    {photo.lensModel && <div style={{ fontSize: "0.8rem", color: "#aaa" }}>{photo.lensModel}</div>}
                  </div>
                </div>
              )}

              {/* Settings Grid */}
              <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
                {photo.focalLength && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>Tiêu cự</div>
                    <div style={{ fontWeight: 600, color: "#fff" }}>{photo.focalLength}mm</div>
                  </div>
                )}
                {photo.fNumber && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>Khẩu độ</div>
                    <div style={{ fontWeight: 600, color: "#fff" }}>f/{photo.fNumber}</div>
                  </div>
                )}
                {photo.exposureTime && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>Tốc độ</div>
                    <div style={{ fontWeight: 600, color: "#fff" }}>{photo.exposureTime}s</div>
                  </div>
                )}
                {photo.iso && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>ISO</div>
                    <div style={{ fontWeight: 600, color: "#fff" }}>{photo.iso}</div>
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
                }}>
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}

