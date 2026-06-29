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
  const resolvedSearchParams = await searchParams;
  const sharedToken = resolvedSearchParams.shared;
  const info = resolvedSearchParams.info;

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

  const showInfo = info === 'true';
  const infoToggleUrl = showInfo 
    ? `/photo/${id}${sharedToken ? `?shared=${sharedToken}` : ''}`
    : `/photo/${id}?info=true${sharedToken ? `&shared=${sharedToken}` : ''}`;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100001, backgroundColor: "#000", display: "flex", overflow: "hidden" }}>
      
      {/* Left side: Photo & Top Bar */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
        
        {/* Top action bar - Fixed overlay inside left pane */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100002, padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)", color: "white" }}>
          <Link href={photo.albumId ? `/albums/${photo.albumId}` : "/"} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "20px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Đóng
          </Link>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isAuth && (
              <>
                <PhotoShareButton photoId={photo.id} existingToken={photo.shareToken} />
                <EditorButton photoId={photo.id} imageUrl={photo.url || ""} />
                <form action={handleToggleFavorite}>
                  <button type="submit" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: photo.isFavorite ? "var(--accent-1)" : "inherit", padding: '0.5rem 1rem' }} title={photo.isFavorite ? "Đã thích" : "Yêu thích"}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={photo.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                </form>
                <form action={handleDelete}>
                  <button type="submit" className="btn" style={{ borderColor: "var(--accent-1)", color: "var(--accent-1)", background: "rgba(255,255,255,0.1)", padding: '0.5rem 1rem' }} title="Xóa">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </form>
              </>
            )}
            {/* Info Toggle Button */}
            <Link href={infoToggleUrl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: showInfo ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }} title="Thông tin">
              <svg width="20" height="20" viewBox="0 0 24 24" fill={showInfo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </Link>
          </div>
        </div>

        {/* Main Photo Viewport */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
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
      </div>

      {/* Sidebar Info Section */}
      {showInfo && (
        <div style={{ width: "360px", minWidth: "360px", backgroundColor: "#1e1e1e", color: "#eee", display: "flex", flexDirection: "column", borderLeft: "1px solid #333", overflowY: "auto" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backgroundColor: "#1e1e1e", zIndex: 10 }}>
            <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 500 }}>Thông tin</h2>
            <Link href={infoToggleUrl} style={{ color: "#aaa", textDecoration: "none", display: "flex" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </Link>
          </div>
          
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* Details or Edit Form */}
            <div>
              {isAuth ? (
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "1.5rem", borderRadius: "12px" }}>
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
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "1.5rem", marginBottom: "0.5rem", color: "#fff" }}>
                    {photo.altText}
                  </h1>
                  {photo.description && (
                    <p style={{ color: "#aaa", fontSize: "0.95rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {photo.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Details List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", color: "#888", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>Đã tải lên: {photo.createdAt.toLocaleDateString()}</span>
              </div>
              {photo.dateTaken && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Chụp lúc: {photo.dateTaken.toLocaleDateString()}</span>
                </div>
              )}
              {photo.album && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                  <span>Album: <Link href={`/albums/${photo.album.id}`} style={{ color: "var(--accent-1)", fontStyle: "italic" }}>{photo.album.name}</Link></span>
                </div>
              )}
              
              {(photo.width && photo.height) ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <span>{photo.width} × {photo.height} px</span>
                </div>
              ) : null}

              {photo.fileSize ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                  <span>{photo.fileSize > 1024 * 1024 ? (photo.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : (photo.fileSize / 1024).toFixed(1) + ' KB'}</span>
                </div>
              ) : null}

              {photo.locationName ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>{photo.locationName}</span>
                </div>
              ) : null}
            </div>

            {/* EXIF Data Section */}
            {(photo.cameraMake || photo.cameraModel || photo.fNumber || photo.exposureTime || photo.iso || photo.focalLength) && (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                {/* Camera / Lens */}
                {(photo.cameraMake || photo.cameraModel) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "#fff" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent-1)", flexShrink: 0 }}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {`${photo.cameraMake || ''} ${photo.cameraModel || ''}`.trim()}
                      </div>
                      {photo.lensModel && <div style={{ fontSize: "0.8rem", color: "#aaa" }}>{photo.lensModel}</div>}
                    </div>
                  </div>
                )}

                {/* Settings Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                  {photo.focalLength && (
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>Tiêu cự</div>
                      <div style={{ fontWeight: 600, color: "#fff" }}>{photo.focalLength}mm</div>
                    </div>
                  )}
                  {photo.fNumber && (
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>Khẩu độ</div>
                      <div style={{ fontWeight: 600, color: "#fff" }}>f/{photo.fNumber}</div>
                    </div>
                  )}
                  {photo.exposureTime && (
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>Tốc độ</div>
                      <div style={{ fontWeight: 600, color: "#fff" }}>{photo.exposureTime}s</div>
                    </div>
                  )}
                  {photo.iso && (
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase" }}>ISO</div>
                      <div style={{ fontWeight: 600, color: "#fff" }}>{photo.iso}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {photo.tags && photo.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
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
      )}
    </div>
  );
}

