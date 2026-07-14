interface TimelineHeroProps {
  totalDated: number;
  totalAll: number;
  yearCount: number;
}

export function TimelineHero({ totalDated, totalAll, yearCount }: TimelineHeroProps) {
  return (
    <div className="tl-hero">
      <span className="tl-hero-eyebrow animate-hero-1">Kỷ Niệm Của Chúng Ta</span>
      <h1 className="tl-hero-title animate-hero-2">Dòng Thời Gian</h1>
      <div className="tl-hero-ornament animate-hero-3">
        <div className="tl-hero-ornament-line" />
        <div className="tl-hero-ornament-diamond" />
        <div className="tl-hero-ornament-line" />
      </div>
      {totalAll > 0 && (
        <p className="tl-hero-stats animate-hero-4">
          {totalDated} kỷ niệm có ngày chụp &nbsp;·&nbsp; {yearCount} năm
        </p>
      )}
    </div>
  );
}
