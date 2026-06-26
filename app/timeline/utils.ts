// ── Timeline Helper Functions ─────────────────────────────────────────────

export function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000)
    .toISOString()
    .slice(0, 10);

  if (dateStr === today) return "Hôm nay";
  if (dateStr === yesterday) return "Hôm qua";

  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonthHeading(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

export function formatYearLabel(dateStr: string): string {
  return dateStr.slice(0, 4);
}

export function groupPhotosByDate(photos: any[]) {
  const datedPhotos = photos.filter((p) => p.dateTaken !== null);
  const undatedPhotos = photos.filter((p) => p.dateTaken === null);

  const byDay: Record<string, typeof photos> = {};
  for (const photo of datedPhotos) {
    const key = getDayKey(new Date(photo.dateTaken!));
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(photo);
  }

  const byYear: Record<string, Record<string, string[]>> = {};
  for (const dayKey of Object.keys(byDay)) {
    const yearKey = dayKey.slice(0, 4);
    const monthKey = dayKey.slice(0, 7);
    if (!byYear[yearKey]) byYear[yearKey] = {};
    if (!byYear[yearKey][monthKey]) byYear[yearKey][monthKey] = [];
    byYear[yearKey][monthKey].push(dayKey);
  }

  return { byDay, byYear, datedPhotos, undatedPhotos };
}
