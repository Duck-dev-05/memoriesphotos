import { PhotoCell } from "./PhotoCell";

interface YearSectionProps {
  yearKey: string;
  monthsInYear: Record<string, string[]>;
  byDay: Record<string, any[]>;
  formatMonthHeading: (dateStr: string) => string;
  formatDayLabel: (dateStr: string) => string;
}

export function YearSection({ yearKey, monthsInYear, byDay, formatMonthHeading, formatDayLabel }: YearSectionProps) {
  const monthKeys = Object.keys(monthsInYear).sort((a, b) => b.localeCompare(a));
  const photosInYear = monthKeys.flatMap(mk => monthsInYear[mk].flatMap(dk => byDay[dk])).length;

  return (
    <section key={yearKey} id={`year-${yearKey}`} className="tl-year-section">
      <div className="tl-year-banner">
        <div className="tl-year-banner-line" />
        <div className="tl-year-badge">
          <span className="tl-year-badge-num">{yearKey}</span>
          <span className="tl-year-badge-count">{photosInYear} ảnh</span>
        </div>
        <div className="tl-year-banner-line" />
      </div>

      {monthKeys.map((monthKey) => {
        const dayKeys = monthsInYear[monthKey].sort((a, b) => b.localeCompare(a));

        return (
          <section key={monthKey} className="tl-month-section">
            <div className="tl-month-heading">
              <h2 className="tl-month-text">{formatMonthHeading(dayKeys[0])}</h2>
              <div className="tl-month-rule" />
            </div>

            {dayKeys.map((dayKey) => {
              const dayPhotos = byDay[dayKey];
              return (
                <div key={dayKey} className="tl-day-group">
                  <div className="tl-day-header">
                    <div className="tl-day-dot" aria-hidden="true" />
                    <span className="tl-day-label">{formatDayLabel(dayKey)}</span>
                    <span className="tl-day-count">{dayPhotos.length} ảnh</span>
                  </div>

                  <div className="tl-photo-grid">
                    {dayPhotos.map((photo: any, idx: number) => (
                      <PhotoCell key={photo.id} photo={photo} index={idx} />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </section>
  );
}
