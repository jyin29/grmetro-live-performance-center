export function filterEligibleSlides(slides, spreadsheetAvailable) {
  return slides.filter((slide) => !slide.requiresSpreadsheet || spreadsheetAvailable === true);
}

function indexedSlides(registry) {
  return registry.map((slide, index) => ({ ...slide, index }));
}

export function normalizePresentationSelection(snapshot, registry) {
  const allSlides = indexedSlides(registry);
  const defaultEligible = allSlides.filter((slide) => !slide.requiresSpreadsheet);
  const ids = Array.isArray(snapshot?.eligibleSlideIds) ? snapshot.eligibleSlideIds : null;
  const indices = Array.isArray(snapshot?.eligibleSlideIndices) ? snapshot.eligibleSlideIndices : null;
  let eligibleSlides = ids?.length ? ids.map((id) => allSlides.find((slide) => slide.id === id)).filter(Boolean) : null;
  if (!eligibleSlides?.length && indices?.length) eligibleSlides = indices.map((index) => allSlides[index]).filter(Boolean);
  if (!eligibleSlides?.length) eligibleSlides = defaultEligible;
  const activeSlide = eligibleSlides.find((slide) => slide.id === snapshot?.activeSlideId)
    || eligibleSlides.find((slide) => slide.index === snapshot?.activeSlideIndex)
    || eligibleSlides[0];
  return {
    ...snapshot,
    activeSlideId: activeSlide.id,
    activeSlideIndex: activeSlide.index,
    eligibleSlideIds: eligibleSlides.map(({ id }) => id),
    eligibleSlideIndices: eligibleSlides.map(({ index }) => index),
  };
}

export function resolveActiveEligibleSlide(slides, activeSlideId, activeSlideIndex) {
  const slide = slides.find((candidate) => candidate.id === activeSlideId)
    || slides.find((candidate) => candidate.index === activeSlideIndex)
    || slides[0]
    || null;
  return Object.freeze({ slide, position: slide ? slides.indexOf(slide) : -1, count: slides.length });
}
