"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

test("Recognition renders a centered custom crown above the champion card", () => {
  const component = readFileSync(new URL("../apps/dashboard/src/components/slides/RecognitionSlide.jsx", `file://${__filename}`), "utf8");
  const css = readFileSync(new URL("../apps/dashboard/src/tv-slide-polish.css", `file://${__filename}`), "utf8");
  assert.match(component, /<svg className="podium-crown"/);
  assert.match(component, /className="podium-crown__face" fill="#D8AE48" stroke="#9A6815"/);
  assert.match(component, /className="podium-crown__shadow" fill="#B67D1C"/);
  assert.match(component, /className="podium-crown__highlight" fill="none" stroke="#F1D68A"/);
  assert.match(component, /className="podium-crown__base" fill="#B78224"/);
  assert.match(component, /className="podium-crown__jewel" fill="#DDBB62" stroke="#9A6815"/);
  const championDecoration = component.match(/if \(rank === 1\)[\s\S]*?<\/div>;/)?.[0] || "";
  assert.doesNotMatch(championDecoration, /podium-streamer|podium-spark|✦|✧/);
  assert.doesNotMatch(component, /👑/);
  assert.match(css, /podium-decoration--gold[^}]*top:-88px/);
  assert.match(css, /podium-crown[^}]*position:absolute[^}]*width:min\(76%,300px\)[^}]*fill:#D8AE48/);
  assert.match(css, /podium-crown__face[^}]*fill:#D8AE48 !important/);
  assert.match(css, /podium-crown__shadow[^}]*fill:#B67D1C !important/);
  assert.match(css, /podium-crown__highlight[^}]*stroke:#F1D68A !important/);
  assert.match(css, /podium-crown__base[^}]*fill:#B78224 !important/);
  assert.match(css, /podium-crown__jewel[^}]*fill:#DDBB62 !important/);
  assert.doesNotMatch(css.match(/\.podium-crown[^}]*\}/g).join("\n"), /currentColor/);
  assert.doesNotMatch(css, /podium-streamer|podium-spark/);
  assert.match(css, /podium-card--champion[^}]*overflow:visible/);
});
