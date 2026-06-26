import Image from "next/image";
import Link from "next/link";
import { searchPhotos, getAvailableFilters } from "@/app/actions";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "./page.module.css";
import SelectablePhoto from "@/app/components/SelectablePhoto";

export const metadata = {
  title: "Tìm kiếm | Kỷ niệm",
};

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ 
    q?: string, cameraMake?: string, cameraModel?: string, lensModel?: string, 
    iso?: string, focalLength?: string, fNumber?: string, exposureTime?: string,
    dateStart?: string, dateEnd?: string, albumId?: string, isFavorite?: string
  }>
}) {
  const { 
    q, cameraMake, cameraModel, lensModel, iso, focalLength, fNumber, exposureTime,
    dateStart, dateEnd, albumId, isFavorite
  } = await searchParams;

  const query = q || "";
  const parsedIso = iso ? parseInt(iso, 10) : undefined;
  const parsedFocalLength = focalLength ? parseFloat(focalLength) : undefined;
  const parsedFNumber = fNumber ? parseFloat(fNumber) : undefined;
  const parsedDateStart = dateStart ? new Date(dateStart) : undefined;
  const parsedDateEnd = dateEnd ? new Date(dateEnd) : undefined;

  const [photos, availableFilters] = await Promise.all([
    searchPhotos(query, {
      cameraMake,
      cameraModel,
      lensModel,
      iso: !isNaN(parsedIso as number) ? parsedIso : undefined,
      focalLength: !isNaN(parsedFocalLength as number) ? parsedFocalLength : undefined,
      fNumber: !isNaN(parsedFNumber as number) ? parsedFNumber : undefined,
      exposureTime,
      dateStart: parsedDateStart,
      dateEnd: parsedDateEnd,
      albumId,
      isFavorite: isFavorite === 'true' ? true : undefined,
    }),
    getAvailableFilters()
  ]);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tìm kiếm</h1>
        <p className={styles.subtitle}>
          Khám phá lại những ký ức qua thông số nhiếp ảnh.
        </p>
      </header>

      <div className={styles.layout}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar}>
          <form action="/search" method="GET" className={styles.filterForm}>
            
            {/* Chung & Tổ chức */}
            <div className={styles.filterCategory}>
              <h3 className={styles.categoryTitle}>Thông tin chung</h3>
              <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Từ khóa</label>
                  <input 
                    type="text" 
                    name="q" 
                    defaultValue={query}
                    placeholder="Tìm từ khóa, địa điểm..." 
                    className={styles.filterInput} 
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Album</label>
                  <select name="albumId" defaultValue={albumId || ""} className={styles.filterInput}>
                    <option value="">Tất cả Album</option>
                    {availableFilters.albums.map((album: any) => (
                      <option key={album.id} value={album.id}>{album.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      name="isFavorite" 
                      value="true" 
                      defaultChecked={isFavorite === 'true'}
                      className={styles.checkboxInput}
                    />
                    Chỉ ảnh yêu thích
                  </label>
                </div>
              </div>
            </div>

            {/* Thời gian */}
            <div className={styles.filterCategory}>
              <h3 className={styles.categoryTitle}>Thời gian</h3>
              <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Từ ngày</label>
                  <input 
                    type="date" 
                    name="dateStart" 
                    defaultValue={dateStart || ""}
                    className={styles.filterInput} 
                  />
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Đến ngày</label>
                  <input 
                    type="date" 
                    name="dateEnd" 
                    defaultValue={dateEnd || ""}
                    className={styles.filterInput} 
                  />
                </div>
              </div>
            </div>

            {/* Thông số kỹ thuật */}
            <div className={styles.filterCategory}>
              <h3 className={styles.categoryTitle}>Thông số kỹ thuật</h3>
              <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Hãng máy ảnh</label>
                  <select name="cameraMake" defaultValue={cameraMake || ""} className={styles.filterInput}>
                    <option value="">Tất cả hãng</option>
                    {availableFilters.cameraMakes.map((make: string, i: number) => (
                      <option key={i} value={make}>{make}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Dòng máy ảnh</label>
                  <select name="cameraModel" defaultValue={cameraModel || ""} className={styles.filterInput}>
                    <option value="">Tất cả máy ảnh</option>
                    {availableFilters.cameraModels.map((model: string, i: number) => (
                      <option key={i} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Ống kính</label>
                  <select name="lensModel" defaultValue={lensModel || ""} className={styles.filterInput}>
                    <option value="">Tất cả ống kính</option>
                    {availableFilters.lensModels.map((lens: string, i: number) => (
                      <option key={i} value={lens}>{lens}</option>
                    ))}
                  </select>
                </div>
              
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>ISO</label>
                  <select name="iso" defaultValue={iso || ""} className={styles.filterInput}>
                    <option value="">Tất cả ISO</option>
                    {availableFilters.isos.map((isoVal: number, i: number) => (
                      <option key={i} value={isoVal.toString()}>{isoVal}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Tiêu cự (mm)</label>
                  <select name="focalLength" defaultValue={focalLength || ""} className={styles.filterInput}>
                    <option value="">Tất cả</option>
                    {availableFilters.focalLengths.map((val: number, i: number) => (
                      <option key={i} value={val.toString()}>{val}mm</option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Khẩu độ (f/)</label>
                  <select name="fNumber" defaultValue={fNumber || ""} className={styles.filterInput}>
                    <option value="">Tất cả</option>
                    {availableFilters.fNumbers.map((val: number, i: number) => (
                      <option key={i} value={val.toString()}>f/{val}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Tốc độ màn trập</label>
                  <select name="exposureTime" defaultValue={exposureTime || ""} className={styles.filterInput}>
                    <option value="">Tất cả</option>
                    {availableFilters.exposureTimes.map((val: string, i: number) => (
                      <option key={i} value={val}>{val}s</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.filterActions}>
              <Link href="/search" className={styles.clearButton} style={{ textDecoration: 'none' }}>
                Xóa
              </Link>
              <button type="submit" className={styles.filterButton}>Lọc kết quả</button>
            </div>
          </form>
        </aside>

        {/* Results Area */}
        <div className={styles.resultsArea}>
          <div className={styles.resultsHeader}>
            <span className={styles.resultsCount}>
              Tìm thấy {photos.length} kết quả
            </span>
          </div>

          {photos.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </div>
              <h2 className={styles.emptyTitle}>Không tìm thấy ảnh</h2>
              <p className={styles.emptyDesc}>
                Không có bức ảnh nào khớp với bộ lọc của bạn. Hãy thử thay đổi từ khóa hoặc thông số EXIF.
              </p>
            </div>
          ) : (
            <div className={styles.masonryGallery}>
              {photos.map((photo: any, index: number) => (
                <SelectablePhoto key={photo.id} photo={photo} className={styles.photoTile} style={{ animationDelay: `${index * 0.035}s` }}>
                  <div className={styles.photoTileInner}>
                    <div className={styles.photoTilePlaceholder}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>

                    {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video src={getOptimizedMediaUrl(photo.url || "")} className={styles.photoTileImg} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                    ) : (
                      <Image
                        src={photo.imageData || photo.url || ""}
                        alt={photo.altText || "Ảnh"}
                        fill
                        className={styles.photoTileImg}
                        sizes="(max-width: 480px) 50vw, (max-width: 800px) 33vw, (max-width: 1200px) 25vw, 320px"
                      />
                    )}

                    {photo.tags && photo.tags.length > 0 && (
                      <div className={styles.photoSmartTags}>
                        {photo.tags.slice(0, 2).map((t: any) => (
                          <span key={t.id} className={styles.smallTagBadge}>
                            {t.name === "person" ? "👤" : `#${t.name}`}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={styles.photoTileOverlay} />
                  </div>
                </SelectablePhoto>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
