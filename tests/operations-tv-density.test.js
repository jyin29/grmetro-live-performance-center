"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

let server; let React; let renderToStaticMarkup; let OperationsHealthSlide;
const tvCss = readFileSync(new URL("../apps/dashboard/src/final-tv-readability.css", `file://${__filename}`), "utf8");

function metric(id, label, value, format = "integer") {
  return { id, label, shortLabel: label, value, format, hasData: true, color: "#087f83" };
}

function slideData() {
  const technicians = ["Alex", "Charlie", "Dwight", "Julio", "Shamon"];
  const activityDefinitions = [metric("billableServiceCalls", "Calls", 0), metric("opportunities", "Opportunities", 0), metric("membershipsSold", "Memberships", 0), metric("installs", "Installs", 0)];
  const installDefinitions = [metric("installAverageTicket", "Average Ticket", 0, "currency"), metric("installRevenue", "Revenue", 0, "currency")];
  return {
    period: "today",
    slides: {
      activity: { metrics: activityDefinitions, rows: technicians.map((name, index) => ({ technicianId: index + 1, name, shortName: name, metrics: activityDefinitions.map((definition) => ({ ...definition, value: index + 1 })) })) },
      "average-ticket": { metrics: installDefinitions, rows: technicians.map((name, index) => ({ technicianId: index + 1, name, shortName: name, metrics: installDefinitions.map((definition) => ({ ...definition, value: (index + 1) * 1000 })) })) },
    },
  };
}

before(async () => {
  const { createServer } = await import("vite");
  React = await import("react");
  ({ renderToStaticMarkup } = await import("react-dom/server"));
  server = await createServer({ root: "apps/dashboard", server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ OperationsHealthSlide } = await server.ssrLoadModule("/src/components/slides/OperationsHealthSlide.jsx"));
});

after(async () => server?.close());

test("five install-economics rows claim equal TV card height with short-list typography", () => {
  const markup = renderToStaticMarkup(React.createElement(OperationsHealthSlide, { data: slideData() }));
  assert.match(markup, /install-economics-list is-short-list/);
  assert.match(markup, /--install-row-count:5/);
  for (const name of ["Alex", "Charlie", "Dwight", "Julio", "Shamon"]) assert.match(markup, new RegExp(`>${name}<`));
  assert.match(tvCss, /grid-template-rows:repeat\(var\(--install-row-count\),minmax\(0,1fr\)\)/);
  assert.match(tvCss, /is-short-list \.install-economics-row > strong \{ font-size:30px/);
  assert.match(tvCss, /is-short-list \.install-economics-row__metrics \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(tvCss, /is-short-list \.install-economics-row__metric > span \{ font-size:16px/);
  assert.match(tvCss, /is-short-list \.install-economics-row__metric b \{ font-size:29px/);
});
