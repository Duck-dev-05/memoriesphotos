import { getTimelinePhotos } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import BackToTopButton from "./BackToTopButton";
import { TimelineHero } from "./components/TimelineHero";
import { YearNavigation } from "./components/YearNavigation";
import { YearSection } from "./components/YearSection";
import { UndatedSection } from "./components/UndatedSection";
import { TimelineFooter } from "./components/TimelineFooter";
import { EmptyState } from "./components/EmptyState";
import { groupPhotosByDate, formatMonthHeading, formatDayLabel } from "./utils";
import "./timeline.css";

// ── Component ─────────────────────────────────────────────────────────────
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const isAuth = await isAuthenticated();
  if (!isAuth) redirect("/login");

  const { year } = await searchParams;
  const photos = await getTimelinePhotos();
  const { byDay, byYear, datedPhotos, undatedPhotos } = groupPhotosByDate(photos);

  const allYearKeys = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
  
  // Filter by year if specified
  let displayYearKeys = allYearKeys;
  let displayTotalDated = datedPhotos.length;
  
  if (year && allYearKeys.includes(year)) {
    displayYearKeys = [year];
    // Calculate total photos just for this year
    displayTotalDated = Object.values(byYear[year]).reduce((total, month) => {
      return total + Object.values(month).reduce((acc, days) => acc + days.length, 0);
    }, 0);
  }

  const totalAll = photos.length;

  return (
    <main className="tl-page">
      <TimelineHero totalDated={displayTotalDated} totalAll={totalAll} yearCount={allYearKeys.length} />

      {totalAll === 0 ? (
        <EmptyState />
      ) : (
        <div className="tl-content">
          {allYearKeys.length > 1 && <YearNavigation yearKeys={allYearKeys} selectedYear={year} />}

          {displayYearKeys.map((yearKey) => (
            <YearSection
              key={yearKey}
              yearKey={yearKey}
              monthsInYear={byYear[yearKey]}
              byDay={byDay}
              formatMonthHeading={formatMonthHeading}
              formatDayLabel={formatDayLabel}
            />
          ))}

          {undatedPhotos.length > 0 && !year && (
            <UndatedSection undatedPhotos={undatedPhotos} />
          )}

          <TimelineFooter totalAll={totalAll} yearCount={allYearKeys.length} />
        </div>
      )}

      <BackToTopButton />
    </main>
  );
}
