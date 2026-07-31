"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { detectAchievementEvents, activeEvents } = require("../src/data/achievementEvents");
const { pleasantMaximum, buildAxis } = require("../src/data/axis");

function state(rank, reached = false) { return [{ id: 1, overall: { rank, qualifies: true }, kpis: { revenue: { reached } } }, { id: 2, overall: { rank: rank === 1 ? 2 : 1, qualifies: true }, kpis: { revenue: { reached: false } } }]; }

test("achievement transitions emit once with expiration metadata", () => {
  const previous = state(4, false), current = state(1, true);
  const events = detectAchievementEvents(current, previous, { now: "2026-01-01T00:00:00Z" });
  assert.deepEqual(events.map((event) => event.type).sort(), ["entered-top-three", "goal-reached", "new-leader"]);
  assert.equal(events.every((event) => event.createdAt === "2026-01-01T00:00:00.000Z" && event.expiresAt === "2026-01-01T00:00:03.000Z"), true);
  assert.deepEqual(detectAchievementEvents(current, current), []);
  assert.equal(activeEvents(events, "2026-01-01T00:00:02Z").length, 3);
  assert.equal(activeEvents(events, "2026-01-01T00:00:03Z").length, 0);
});

test("axis maxima match documented examples and ticks are safe and ordered", () => {
  for (const [value, maximum] of [[848,1000],[8420,10000],[12,15],[43,50]]) assert.equal(pleasantMaximum(value), maximum);
  const percentage = buildAxis([12, 90], { format: "percentage", percentage: true });
  assert.equal(percentage.maximum, 100);
  for (const axis of [buildAxis([0]), buildAxis([]), buildAxis([848], { format: "currency" }), percentage]) {
    assert.equal(axis.tickValues[0], 0);
    assert.equal(axis.tickValues.at(-1), axis.maximum);
    assert.equal(axis.tickValues.length >= 4 && axis.tickValues.length <= 6, true);
    assert.deepEqual([...axis.tickValues].sort((a,b) => a-b), axis.tickValues);
  }
});
