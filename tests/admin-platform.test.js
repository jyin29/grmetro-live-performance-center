"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("admin route resolves separately from display and remote routes", async () => {
  const { resolveApplicationRoute } = await import("../apps/dashboard/src/config/applicationRoutes.js");
  assert.deepEqual(resolveApplicationRoute("/admin"), { type: "admin" });
  assert.deepEqual(resolveApplicationRoute("/remote"), { type: "remote" });
  assert.deepEqual(resolveApplicationRoute("/display/main-office"), { type: "display", displayId: "main-office" });
});

test("admin presentation registers required read-only sections and fields", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../apps/dashboard/src/components/admin/AdminPage.jsx"), "utf8");
  for (const section of ["Display Management", "Business Rules", "Presentation Settings", "Event Settings", "Diagnostics", "System Information"]) assert.match(source, new RegExp(section));
  for (const renderer of ["data.displays.map", "data.businessRules.rules.map", "data.diagnostics.cacheAvailable", "data.presentation.rotationIntervalMilliseconds"]) assert.equal(source.includes(renderer), true);
});
