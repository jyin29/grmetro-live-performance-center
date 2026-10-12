"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

test("Recognition keeps its crown artwork and expands it into a centered card header", () => {
  const component = readFileSync(new URL("../apps/dashboard/src/components/slides/RecognitionSlide.jsx", `file://${__filename}`), "utf8");
  const css = readFileSync(new URL("../apps/dashboard/src/final-tv-readability.css", `file://${__filename}`), "utf8");
  assert.match(component, /champion-topper/);
  assert.match(component, /champion-crown/);
  assert.match(css, /podium-card--champion \.champion-topper[^}]*width:100%/);
  assert.match(css, /font-size:clamp\(170px,13vw,250px\)/);
  assert.match(css, /transform:scaleX\(1\.65\)/);
  assert.match(css, /justify-content:center/);
});
