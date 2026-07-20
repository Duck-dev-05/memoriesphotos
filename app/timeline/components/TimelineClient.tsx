"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import { PhotoCell } from "./PhotoCell";
import { YearNavigation } from "./YearNavigation";
import { formatMonthHeading, formatDayLabel } from "../utils";

type TimelineItem = 
  | { type: "year"; yearKey: string; count: number }
  | { type: "month"; label: string }
  | { type: "day-header"; label: string; count: number }
  | { type: "photo-row"; photos: any[] }
  | { type: "undated-header"; count: number }
  | { type: "undated-row"; photos: any[] };

interface TimelineClientProps {
  displayYearKeys: string[];
  allYearKeys: string[];
  byYear: Record<string, Record<string, string[]>>;
  byDay: Record<string, any[]>;
  undatedPhotos: any[];
  year?: string;
}

export function TimelineClient({
  displayYearKeys,
  allYearKeys,
  byYear,
  byDay,
  undatedPhotos,
  year
}: TimelineClientProps) {
  const [containerWidth, setContainerWidth] = useState(800);
  
  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const items = useMemo(() => {
    const list: TimelineItem[] = [];
    
    // Desktop CSS uses repeating grid of roughly 140-200px.
    // We'll calculate columns dynamically
    const columns = Math.max(1, Math.floor(containerWidth / 160));

    for (const yearKey of displayYearKeys) {
      const monthsInYear = byYear[yearKey];
      const monthKeys = Object.keys(monthsInYear).sort((a, b) => b.localeCompare(a));
      const photosInYear = monthKeys.flatMap(mk => monthsInYear[mk].flatMap(dk => byDay[dk])).length;

      list.push({ type: "year", yearKey, count: photosInYear });

      for (const monthKey of monthKeys) {
        const dayKeys = monthsInYear[monthKey].sort((a, b) => b.localeCompare(a));
        list.push({ type: "month", label: formatMonthHeading(dayKeys[0]) });

        for (const dayKey of dayKeys) {
          const dayPhotos = byDay[dayKey];
          list.push({ type: "day-header", label: formatDayLabel(dayKey), count: dayPhotos.length });

          for (let i = 0; i < dayPhotos.length; i += columns) {
            list.push({ type: "photo-row", photos: dayPhotos.slice(i, i + columns) });
          }
        }
      }
    }

    if (undatedPhotos.length > 0 && !year) {
      list.push({ type: "undated-header", count: undatedPhotos.length });
      for (let i = 0; i < undatedPhotos.length; i += columns) {
        list.push({ type: "undated-row", photos: undatedPhotos.slice(i, i + columns) });
      }
    }

    return list;
  }, [displayYearKeys, byYear, byDay, undatedPhotos, year, containerWidth]);

  return (
    <>
      {allYearKeys.length > 1 && <YearNavigation yearKeys={allYearKeys} selectedYear={year} />}
      
      <Virtuoso
        useWindowScroll
        data={items}
        itemContent={(_index, item) => {
          if (item.type === "year") {
            return (
              <div className="tl-year-banner" style={{ marginTop: '2rem' }}>
                <div className="tl-year-banner-line" />
                <div className="tl-year-badge">
                  <span className="tl-year-badge-num">{item.yearKey}</span>
                  <span className="tl-year-badge-count">{item.count} ảnh</span>
                </div>
                <div className="tl-year-banner-line" />
              </div>
            );
          }
          if (item.type === "month") {
            return (
              <div className="tl-month-heading" style={{ marginTop: '2rem' }}>
                <h2 className="tl-month-text">{item.label}</h2>
                <div className="tl-month-rule" />
              </div>
            );
          }
          if (item.type === "day-header") {
            return (
              <div className="tl-day-header" style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                <div className="tl-day-dot" aria-hidden="true" />
                <span className="tl-day-label">{item.label}</span>
                <span className="tl-day-count">{item.count} ảnh</span>
              </div>
            );
          }
          if (item.type === "undated-header") {
            return (
              <div className="tl-month-heading" style={{ marginTop: '3rem' }}>
                <h2 className="tl-month-text">Không có ngày ({item.count} ảnh)</h2>
                <div className="tl-month-rule" />
              </div>
            );
          }
          if (item.type === "photo-row" || item.type === "undated-row") {
            return (
              <div className="tl-photo-grid" style={{ marginBottom: '1rem' }}>
                {item.photos.map((photo, idx) => (
                  <PhotoCell key={photo.id} photo={photo} index={idx} />
                ))}
              </div>
            );
          }
          return null;
        }}
      />
    </>
  );
}
