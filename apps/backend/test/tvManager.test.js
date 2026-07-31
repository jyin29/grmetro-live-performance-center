"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const televisions = require("../../../shared/televisions");
const { TV_MODES } = require("../../../shared/constants");
const { TvManager } = require("../src/tv/tvManager");
const { ExpirationMonitor } = require("../src/tv/expirationMonitor");

function fakeTime(start = "2026-07-31T16:00:00.000Z") {
  let now = new Date(start).getTime();
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  function runDue() {
    let due;
    do {
      due = [...timeouts.entries()].filter(([, timer]) => timer.at <= now).sort((a, b) => a[1].at - b[1].at)[0];
      if (due) { timeouts.delete(due[0]); due[1].callback(); }
    } while (due);
  }
  return {
    clock: () => new Date(now),
    setTimeout: (callback, delay) => { const id = nextId++; timeouts.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: (id) => timeouts.delete(id),
    setInterval: (callback, delay) => { const id = nextId++; intervals.set(id, { callback, delay }); return id; },
    clearInterval: (id) => intervals.delete(id),
    advance(milliseconds) {
      const destination = now + milliseconds;
      while (true) {
        const nextInterval = [...intervals.values()].map((item) => item.next ?? (item.next = now + item.delay))
          .filter((at) => at <= destination).sort((a, b) => a - b)[0];
        const nextTimeout = [...timeouts.values()].map(({ at }) => at).filter((at) => at <= destination).sort((a, b) => a - b)[0];
        const next = Math.min(nextInterval ?? Infinity, nextTimeout ?? Infinity);
        if (!Number.isFinite(next)) break;
        now = next;
        for (const interval of intervals.values()) if (interval.next === now) { interval.next += interval.delay; interval.callback(); }
        runDue();
      }
      now = destination;
      runDue();
    },
    get timeoutCount() { return timeouts.size; },
    get intervalCount() { return intervals.size; }
  };
}

function setup() {
  const time = fakeTime();
  const events = [];
  const manager = new TvManager({
    overrideMilliseconds: 120000, returnTransitionMilliseconds: 1000, clock: time.clock,
    setTimeoutFn: time.setTimeout, clearTimeoutFn: time.clearTimeout,
    onStateChange: (state) => events.push(state)
  });
  const monitor = new ExpirationMonitor({
    tvManager: manager, setIntervalFn: time.setInterval, clearIntervalFn: time.clearInterval
  });
  return { time, events, manager, monitor };
}

test("all configured televisions initialize independently in LIVE mode", () => {
  const { manager } = setup();
  const states = manager.getTelevisions();
  assert.equal(states.length, televisions.length);
  for (const state of states) assert.deepEqual(state, {
    id: televisions.find(({ id }) => id === state.id).id,
    name: televisions.find(({ id }) => id === state.id).name,
    mode: TV_MODES.LIVE, viewType: null, selectedTechnicianId: null, selectedKpiId: null,
    selectedSlideId: null, overrideStartedAt: null, expiresAt: null,
    updatedAt: "2026-07-31T16:00:00.000Z", revision: 1
  });
  assert.notStrictEqual(states[0], states[1]);
});

test("technician, KPI, and combined overrides resolve their views", () => {
  const { manager } = setup();
  const technician = manager.overrideTechnician("tv-1", { technicianId: "3841" });
  assert.equal(technician.mode, TV_MODES.REMOTE);
  assert.equal(technician.viewType, "technician-scorecard");
  assert.equal(technician.selectedTechnicianId, 3841);
  assert.equal(technician.selectedSlideId, "technician-detail");
  const kpi = manager.overrideKpi("tv-2", { kpiId: "closingRate" });
  assert.equal(kpi.mode, TV_MODES.REMOTE);
  assert.equal(kpi.viewType, "kpi");
  assert.equal(kpi.selectedSlideId, "performance");
  const combined = manager.overrideTechnicianKpi("tv-3", { technicianId: 3853, kpiId: "installAverageTicket" });
  assert.equal(combined.mode, TV_MODES.REMOTE);
  assert.equal(combined.viewType, "technician-kpi");
  assert.equal(combined.selectedSlideId, "technician-kpi-detail");
  assert.equal(manager.resolveParentSlide("revenue"), "revenue");
  assert.equal(manager.resolveParentSlide("billableServiceCalls"), "activity");
  assert.equal(manager.resolveParentSlide("installAverageTicket"), "average-ticket");
});

test("invalid identifiers, empty overrides, and unsupported fields reject strictly", () => {
  const { manager } = setup();
  assert.throws(() => manager.getTelevision("unknown"), /Invalid television ID/);
  assert.throws(() => manager.overrideTechnician("tv-1", { technicianId: 999 }), /Invalid technician ID/);
  assert.throws(() => manager.overrideKpi("tv-1", { kpiId: "madeUp" }), /Invalid KPI ID/);
  assert.throws(() => manager.overrideTechnician("tv-1", {}), /Invalid technician ID/);
  assert.throws(() => manager.overrideKpi("tv-1", {}), /Invalid KPI ID/);
  assert.throws(() => manager.overrideTechnicianKpi("tv-1", {}), /Invalid technician ID/);
  assert.throws(() => manager.overrideKpi("tv-1", { kpiId: "revenue", extra: true }), /unsupported field/);
  assert.throws(() => manager.resumeLive("tv-1", { now: true }), /unsupported field/);
});

test("latest command wins, every mutation increments revision, and other TVs do not change", () => {
  const { manager } = setup();
  const untouched = manager.getTelevision("tv-2");
  const first = manager.overrideTechnician("tv-1", { technicianId: 3841 });
  const second = manager.overrideKpi("tv-1", { kpiId: "revenue" });
  const third = manager.clearSelections("tv-1");
  assert.deepEqual([first.revision, second.revision, third.revision], [2, 3, 4]);
  assert.equal(second.mode, TV_MODES.REMOTE);
  assert.equal(second.viewType, "kpi");
  assert.equal(second.selectedTechnicianId, null);
  assert.equal(second.selectedKpiId, "revenue");
  assert.equal(third.selectedKpiId, null);
  assert.deepEqual(manager.getTelevision("tv-2"), untouched);
});

test("repeated commands and explicit timer resets restore the full timeout", () => {
  const { manager, time } = setup();
  const first = manager.overrideKpi("tv-1", { kpiId: "revenue" });
  time.advance(30000);
  const repeated = manager.overrideKpi("tv-1", { kpiId: "revenue" });
  assert.equal(repeated.revision, first.revision + 1);
  assert.equal(repeated.expiresAt, "2026-07-31T16:02:30.000Z");
  time.advance(30000);
  const reset = manager.resetOverrideTimer("tv-1");
  assert.equal(reset.revision, repeated.revision + 1);
  assert.equal(reset.expiresAt, "2026-07-31T16:03:00.000Z");
});

test("automatic expiration emits RETURNING then LIVE and clears selections", () => {
  const { manager, monitor, time, events } = setup();
  const other = manager.getTelevision("tv-2");
  manager.overrideTechnicianKpi("tv-1", { technicianId: 3841, kpiId: "closingRate" });
  monitor.start();
  time.advance(120000);
  assert.equal(manager.getTelevision("tv-1").mode, TV_MODES.RETURNING);
  assert.equal(manager.getTelevision("tv-1").viewType, "technician-kpi");
  assert.equal(manager.getTelevision("tv-1").revision, 3);
  time.advance(1000);
  const live = manager.getTelevision("tv-1");
  assert.equal(live.mode, TV_MODES.LIVE);
  assert.equal(live.revision, 4);
  assert.equal(live.selectedTechnicianId, null);
  assert.equal(live.selectedKpiId, null);
  assert.equal(live.selectedSlideId, null);
  assert.equal(live.viewType, null);
  assert.deepEqual(events.map(({ mode }) => mode), [TV_MODES.REMOTE, TV_MODES.RETURNING, TV_MODES.LIVE]);
  assert.deepEqual(manager.getTelevision("tv-2"), other);
  monitor.stop();
});

test("manual resume uses the same sequence and a newer command cancels stale return", () => {
  const { manager, time, events } = setup();
  manager.overrideTechnician("tv-1", { technicianId: 3841 });
  const returning = manager.resumeLive("tv-1");
  assert.equal(returning.mode, TV_MODES.RETURNING);
  assert.equal(returning.revision, 3);
  time.advance(500);
  const latest = manager.overrideKpi("tv-1", { kpiId: "closingRate" });
  time.advance(500);
  assert.equal(manager.getTelevision("tv-1").mode, TV_MODES.REMOTE);
  assert.equal(manager.getTelevision("tv-1").viewType, "kpi");
  assert.equal(manager.getTelevision("tv-1").revision, latest.revision);
  manager.resumeLive("tv-1");
  time.advance(1000);
  assert.equal(manager.getTelevision("tv-1").mode, TV_MODES.LIVE);
  assert.equal(manager.getTelevision("tv-1").viewType, null);
  assert.deepEqual(events.slice(-2).map(({ mode }) => mode), [TV_MODES.RETURNING, TV_MODES.LIVE]);
});

test("monitor and transition timer cleanup prevents callbacks after shutdown", () => {
  const { manager, monitor, time } = setup();
  manager.overrideKpi("tv-1", { kpiId: "revenue" });
  manager.resumeLive("tv-1");
  monitor.start();
  assert.equal(time.timeoutCount, 1);
  assert.equal(time.intervalCount, 1);
  monitor.stop();
  assert.equal(time.timeoutCount, 0);
  assert.equal(time.intervalCount, 0);
  time.advance(2000);
  assert.equal(manager.getTelevision("tv-1").mode, TV_MODES.RETURNING);
});
