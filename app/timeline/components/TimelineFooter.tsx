interface TimelineFooterProps {
  totalAll: number;
  yearCount: number;
}

export function TimelineFooter({ totalAll, yearCount }: TimelineFooterProps) {
  return (
    <div className="tl-footer">
      <div className="tl-footer-ornament">
        <div className="tl-footer-ornament-line" />
        <div className="tl-footer-ornament-diamond" />
        <div className="tl-footer-ornament-line" />
      </div>
      <p className="tl-footer-text">{totalAll} kỷ niệm &nbsp;·&nbsp; {yearCount} năm</p>
    </div>
  );
}
