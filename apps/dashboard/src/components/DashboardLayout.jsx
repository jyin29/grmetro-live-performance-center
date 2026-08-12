import { usePresentationController } from "../controller/PresentationController";
import { Header } from "./Header";
import { ManagementAttention } from "./ManagementAttention";
import { SlideDeck } from "./SlideDeck";
import { managementInsights } from "../lib/presentation";

export function DashboardLayout({ data, displayId, error, refreshing }) {
  const presentation = usePresentationController(displayId);
  const rotationPaused = !presentation.isRunning || refreshing || Boolean(error);

  return <div className="app-shell">
    <Header refreshedAt={data.refreshedAt} refreshing={refreshing} hasError={Boolean(error)} />
    <ManagementAttention insights={managementInsights(data, { hasError: Boolean(error), refreshing })} />
    <SlideDeck
      data={data}
      slideIndex={presentation.activeSlideIndex}
      onSelectSlide={presentation.selectSlide}
      presentationState={{ hasError: Boolean(error), refreshing, rotationPaused }}
    />
    <footer className="footer"><span><i className="live-dot" />Live ServiceTitan data</span><span>Presentation · {presentation.connectionState === "connected" ? "synchronized" : "reconnecting"}</span><time>{new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></footer>
  </div>;
}
