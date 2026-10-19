"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

test("Recognition renders a centered custom crown above the champion card", () => {
  const component = readFileSync(new URL("../apps/dashboard/src/components/slides/RecognitionSlide.jsx", `file://${__filename}`), "utf8");
  const css = readFileSync(new URL("../apps/dashboard/src/tv-slide-polish.css", `file://${__filename}`), "utf8");
  assert.match(component, /<svg className="podium-crown"/);
  assert.match(component, /podium-streamer--left/);
  assert.match(component, /podium-spark--four/);
  assert.doesNotMatch(component, /👑/);
  assert.match(css, /podium-decoration--gold[^}]*top:-88px/);
  assert.match(css, /podium-crown[^}]*position:absolute/);
  assert.match(css, /podium-card--champion[^}]*overflow:visible/);
});
