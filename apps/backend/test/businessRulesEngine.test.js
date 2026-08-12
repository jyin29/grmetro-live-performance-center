"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const configuration = require("../../../shared/businessRules");
const { evaluateBusinessRules, matches } = require("../src/rules/businessRulesEngine");

test("conditions compose and safely distinguish current from previous values", () => {
  assert.equal(matches({ all: [{ path: "rank", operator: "lessThanOrEqual", value: 3 },
    { path: "rank", source: "previous", operator: "greaterThan", value: 3 }] },
  { current: { rank: 2 }, previous: { rank: 4 } }), true);
  assert.throws(() => matches({ path: "rank", operator: "calculateSomething", value: 1 }, { current: {} }), /Unsupported/);
});

test("configured celebrations, milestones, and alerts consume prepared KPI fields", () => {
  const previous = [{ id: "tech-1", overall: { qualifies: true, rank: 4 }, kpis: { revenue: { reached: false } } }];
  const current = [{ id: "tech-1", name: "Taylor", overall: { qualifies: true, rank: 1 }, kpis: {
    revenue: { label: "Revenue", hasData: true, reached: true, dataQuality: "confirmed" },
    installs: { label: "Installs", hasData: false, reached: false, dataQuality: "unavailable" }
  } }];
  const result = evaluateBusinessRules({ rules: configuration.rules, current, previous, now: "2026-08-12T12:00:00Z",
    eventDurationMilliseconds: configuration.settings.eventDurationMilliseconds });
  assert.deepEqual(result.events.map(({ type }) => type), ["new-leader", "entered-top-three", "goal-reached"]);
  assert.equal(result.managementInsights[0].title, "Installs needs review");
  assert.equal(result.events.every((event) => event.ruleId && event.priority), true);
});
