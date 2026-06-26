import { PhotoCell } from "./PhotoCell";

interface UndatedSectionProps {
  undatedPhotos: any[];
}

export function UndatedSection({ undatedPhotos }: UndatedSectionProps) {
  return (
    <section className="tl-year-section tl-undated-section">
      <div className="tl-year-banner">
        <div className="tl-year-banner-line" />
        <div className="tl-year-badge tl-year-badge--muted">
          <span className="tl-year-badge-num">Chưa rõ ngày</span>
          <span className="tl-year-badge-count">{undatedPhotos.length} ảnh</span>
        </div>
        <div className="tl-year-banner-line" />
      </div>
      <div className="tl-photo-grid tl-undated-grid">
        {undatedPhotos.map((photo: any, idx: number) => (
          <PhotoCell key={photo.id} photo={photo} index={idx} showDate={false} />
        ))}
      </div>
    </section>
  );
}
