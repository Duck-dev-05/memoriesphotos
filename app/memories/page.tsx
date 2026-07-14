import { Metadata } from "next";
import { getMemories } from "@/app/actions";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";
import MemoryStoryInput from "./MemoryStoryInput";
import "./memories.css";

export const metadata: Metadata = {
  title: "Cùng Ngày Này Năm Xưa",
  description: "Sống lại những khoảnh khắc đã qua — những kỷ niệm đẹp của chúng ta.",
  openGraph: {
    title: "Cùng Ngày Này Năm Xưa | Kỷ Niệm",
    description: "Sống lại những khoảnh khắc đã qua — những kỷ niệm đẹp của chúng ta.",
    url: "/memories",
  }
};

export default async function MemoriesPage() {
  const memories = await getMemories();

  const today = new Date();
  const dayMonth = `${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
  
  // Get stories for today
  // We need to import getMemoryStories from actions.ts
  const { getMemoryStories } = await import("@/app/actions");
  const stories = await getMemoryStories(dayMonth);
  const storyMap = new Map<number, string>();
  for (const story of stories) {
    storyMap.set(story.year, story.content);
  }

  // Group by year
  const byYear = new Map<number, typeof memories>();
  for (const photo of memories) {
    const year = new Date(photo.dateTaken!).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(photo);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  const todayStr = today.toLocaleDateString("vi-VN", { day: "numeric", month: "long" });

  return (
    <div className="page">
      {/* Hero */}
      <section className="hero">
        <span className="heroEyebrow">Cùng Ngày Này Năm Xưa</span>
        <h1 className="heroTitle">
          Kỷ Niệm <em>Đáng Nhớ</em>
        </h1>
        <p className="heroSub">
          Những khoảnh khắc từ các năm trước, đúng ngày hôm nay.
        </p>
        <span className="heroDate">📅 {todayStr}</span>

        <div className="heroActions">
          <Link href="/timeline" className="slideshowBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Xem Dòng Thời Gian
          </Link>
          <Link href="/" className="slideshowBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            Về Trang Chủ
          </Link>
        </div>
      </section>

      {memories.length === 0 ? (
        <div className="empty">
          <span className="emptyIcon">📷</span>
          <h2 className="emptyTitle">Chưa có kỷ niệm nào hôm nay</h2>
          <p className="emptyText">
            Chưa có ảnh nào được chụp vào ngày này trong những năm trước.
            Hãy tải lên thêm ảnh có ngày chụp để xem kỷ niệm xuất hiện ở đây nhé!
          </p>
        </div>
      ) : (
        <div className="content">
          {years.map((year, gi) => {
            const photos = byYear.get(year)!;
            return (
              <div
                key={year}
                className="yearGroup"
                style={{ animationDelay: `${gi * 0.12}s` }}
              >
                {/* Year header */}
                <div className="yearHeader">
                  <span className="yearBadge">{year}</span>
                  <div className="yearDivider" />
                  <span className="yearCount">{photos.length} kỷ niệm</span>
                </div>

                {/* Story Input */}
                <MemoryStoryInput 
                  dayMonth={dayMonth} 
                  year={year} 
                  initialContent={storyMap.get(year) || ""} 
                />

                {/* Photo grid */}
                <div className="photoGrid">
                  {photos.map((photo: any, i: number) => {
                    const src = photo.url || photo.imageData || "";
                    const isVideo = src.match(/\.(mp4|webm|ogg|mov)$/i);
                    return (
                      <Link
                        key={photo.id}
                        href={`/photo/${photo.id}`}
                        className="card"
                        style={{ animationDelay: `${gi * 0.12 + i * 0.05}s` }}
                      >
                        <div className="cardTape" />
                        <span className="cardYear">{year}</span>
                        <div className="cardImage">
                          {isVideo ? (
                            <video src={getOptimizedMediaUrl(src)} className="cardImg" muted />
                          ) : src ? (
                            <Image
                              src={src}
                              alt={photo.altText}
                              fill
                              className="cardImg"
                              sizes="260px"
                            />
                          ) : (
                            <div className="cardImg" style={{ background: "var(--bg-tertiary)" }} />
                          )}
                        </div>
                        <div className="cardCaption">{photo.altText}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
