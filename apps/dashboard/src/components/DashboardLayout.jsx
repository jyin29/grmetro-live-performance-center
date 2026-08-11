import { useEffect, useState } from "react";
import { SLIDE_ROTATION_INTERVAL_MS, nextSlideIndex } from "../config/slideRotation";
import { Header } from "./Header";
import { dashboardSlides, SlideDeck } from "./SlideDeck";

export function DashboardLayout({ data, error, refreshing }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const rotationPaused = refreshing || Boolean(error);

  useEffect(() => {
    if (rotationPaused || dashboardSlides.length < 2) return undefined;

    const interval = window.setInterval(() => {
      setSlideIndex((currentIndex) => nextSlideIndex(currentIndex, dashboardSlides.length));
    }, SLIDE_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [rotationPaused]);

  return <div className="app-shell">
    <Header refreshedAt={data.refreshedAt} refreshing={refreshing} hasError={Boolean(error)} />
    {error && <div className="inline-warning">Live updates are temporarily interrupted. Showing the last successful update.</div>}
    <SlideDeck data={data} slideIndex={slideIndex} onSelectSlide={setSlideIndex} />
    <footer className="footer"><span><i className="live-dot" />Live ServiceTitan data</span><span>Production dashboard · REST connected</span><time>{new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></footer>
  </div>;
}
