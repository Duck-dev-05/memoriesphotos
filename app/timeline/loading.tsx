import React from "react";
import { TimelineHero } from "./components/TimelineHero";
import "./timeline.css";

export default function LoadingTimeline() {
  return (
    <main className="tl-page">
      <TimelineHero totalDated={0} totalAll={0} yearCount={0} />
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="vintage-spinner"></div>
      </div>
    </main>
  );
}
