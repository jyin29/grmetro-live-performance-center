import { useEffect } from "react";
import { usePresentationController } from "../controller/PresentationController";
import { Header } from "./Header";
import { SlideDeck } from "./SlideDeck";

export function DashboardLayout({ data, error, refreshing }) {
  const presentation = usePresentationController();
  const rotationPaused = !presentation.isRunning || refreshing || Boolean(error);

  useEffect(() => {
    presentation.setRuntimePaused(refreshing || Boolean(error));
    return () => presentation.setRuntimePaused(false);
  }, [error, presentation.setRuntimePaused, refreshing]);

  return <div className="app-shell">
    <Header refreshedAt={data.refreshedAt} refreshing={refreshing} hasError={Boolean(error)} />
    {error && <div className="inline-warning">Live updates are temporarily interrupted. Showing the last successful update.</div>}
    <SlideDeck
      data={data}
      slideIndex={presentation.activeSlideIndex}
      onSelectSlide={presentation.selectSlide}
      presentationState={{ hasError: Boolean(error), refreshing, rotationPaused }}
    />
    <footer className="footer"><span><i className="live-dot" />Live ServiceTitan data</span><span>Production dashboard · REST connected</span><time>{new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></footer>
  </div>;
}
