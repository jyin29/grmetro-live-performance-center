"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

test("Recognition renders a centered custom crown above the champion card", () => {
  const component = readFileSync(new URL("../apps/dashboard/src/components/slides/RecognitionSlide.jsx", `file://${__filename}`), "utf8");
  const css = readFileSync(new URL("../apps/dashboard/src/tv-slide-polish.css", `file://${__filename}`), "utf8");
  assert.match(component, /<svg className="podium-crown"/);
  assert.match(component, /className="podium-crown__face" fill="#FFD700" stroke="#D49419"/);
  assert.match(component, /className="podium-crown__base" fill="#D49419"/);
  assert.match(component, /className="podium-crown__jewel" fill="#F5B942" stroke="#D49419"/);
  assert.match(component, /podium-streamer--left/);
  assert.match(component, /podium-spark--four/);
  assert.doesNotMatch(component, /👑/);
  assert.match(css, /podium-decoration--gold[^}]*top:-88px/);
  assert.match(css, /podium-crown[^}]*position:absolute[^}]*fill:#FFD700/);
  assert.match(css, /podium-crown__face[^}]*fill:#FFD700 !important/);
  assert.match(css, /podium-crown__base[^}]*fill:#D49419 !important/);
  assert.match(css, /podium-crown__jewel[^}]*fill:#F5B942 !important/);
  assert.doesNotMatch(css.match(/\.podium-crown[^}]*\}/g).join("\n"), /currentColor/);
  assert.match(css, /podium-card--champion[^}]*overflow:visible/);
});
