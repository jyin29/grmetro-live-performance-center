"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { candidatesFromPayload, createEventEngine } = require("../src/events/eventEngine");
const { createPresentationManager } = require("../src/presentation/presentationManager");

function fakeTime(start = "2026-08-12T12:00:00.000Z") {
  let now = Date.parse(start); let id = 0; const timers = new Map();
  const api = { clock: () => new Date(now), setTimeoutFn(callback, delay) { const timerId = ++id; timers.set(timerId, { callback, at: now + delay }); return timerId; },
    clearTimeoutFn(timerId) { timers.delete(timerId); }, advance(milliseconds) { const end = now + milliseconds;
      while (true) { const due = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break; timers.delete(due[0]); now = due[1].at; due[1].callback(); } now = end; }, timers };
  return api;
}

function payload(events, managementInsights) {
  return { events, managementInsights, technicians: [{ id: "1", name: "Taylor", shortName: "Taylor", overall: { rank: 1 },
    kpis: { revenue: { label: "Revenue", hasData: true, reached: true, percentComplete: 112 } } }] };
}

test("event generation uses only existing achievements and backend management insights", () => {
  const generated = candidatesFromPayload(payload([
    { type: "goal-reached", technicianId: "1", kpiId: "revenue", createdAt: "2026-08-12T12:00:00Z" },
    { type: "new-leader", technicianId: "1", createdAt: "2026-08-12T12:00:00Z" },
    { type: "unknown", technicianId: "1" }
  ], [{ id: "feed", priority: "critical", title: "Feed interrupted", detail: "Last update retained." },
    { id: "warning", priority: "warning", title: "Not an event" }]));
  assert.deepEqual(generated.map(({ key, priority }) => [key, priority]), [
    ["goal-reached:1:revenue", "celebration"], ["new-leader:1", "celebration"], ["insight:feed", "critical"]]);
});

test("queue prioritizes deterministically, deduplicates, cools down, expires, and remains bounded", () => {
  const time = fakeTime(); const engine = createEventEngine({ ...time, displayDurationMilliseconds: 1000,
    cooldownMilliseconds: 5000, maximumQueueSize: 2, maximumDeduplicationEntries: 3 });
  engine.enqueue([{ key: "info", priority: "information", title: "Info" }]);
  assert.equal(engine.getState().activeEvent.key, "info");
  engine.enqueue([{ key: "celebrate-b", priority: "celebration", title: "B" }, { key: "critical", priority: "critical", title: "Critical" },
    { key: "celebrate-a", priority: "celebration", title: "A" }, { key: "critical", priority: "critical", title: "duplicate" }]);
  assert.equal(engine.getState().queueLength, 2);
  time.advance(1000); assert.equal(engine.getState().activeEvent.key, "critical");
  time.advance(1000); assert.equal(engine.getState().activeEvent.key, "celebrate-a");
  time.advance(1000); assert.equal(engine.getState().activeEvent, null);
  engine.enqueue([{ key: "info", priority: "information", title: "repeat" }]); assert.equal(engine.getState().activeEvent, null);
  time.advance(3000); engine.enqueue([{ key: "info", priority: "information", title: "after cooldown" }]);
  assert.equal(engine.getState().activeEvent.key, "info"); engine.destroy();
});

test("one authoritative event pauses and resumes every display without changing its slide", () => {
  const time = fakeTime(); const engine = createEventEngine({ ...time, displayDurationMilliseconds: 5000, cooldownMilliseconds: 10000 });
  const manager = createPresentationManager({ displays: [{ id: "a", name: "A" }, { id: "b", name: "B" }], slideCount: 5,
    rotationMilliseconds: 30000, eventEngine: engine, ...time });
  time.advance(10000); engine.enqueue([{ key: "win", priority: "celebration", title: "A win" }]);
  for (const state of manager.getDisplayStates()) { assert.equal(state.event.key, "win"); assert.equal(state.rotationPausedForEvent, true); assert.equal(state.activeSlideIndex, 0); }
  time.advance(4999); assert.equal(manager.getDisplayState("a").activeSlideIndex, 0);
  time.advance(1); assert.equal(manager.getDisplayState("a").event, null);
  time.advance(29999); assert.equal(manager.getDisplayState("a").activeSlideIndex, 0);
  time.advance(1); assert.deepEqual(manager.getDisplayStates().map((state) => state.activeSlideIndex), [1, 1]);
  manager.destroy(); engine.destroy();
});
