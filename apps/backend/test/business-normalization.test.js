"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const technicians = require("../../../shared/technicians");
const { normalizeServiceTitanTechnician } = require("../src/data/normalization");
const { ratioToPercentage } = require("../src/data/normalization/percentage");
const { calculateGoal, resolveGoal, applyGoals } = require("../src/data/goalEngine");

test("normalizer allow-lists confirmed fields, configured identity, and converts ratios once", () => {
  const raw = { TechnicianId: "134926818", CompletedRevenue: 848, Opportunity: 12, TechLeadJobs: 0,
    MarketingLeadJobs: 3, MembershipsSold: 2, CloseRate: 0.43, phoneNumber: "private", email: "private@example.test", CompletedJobs: 99, TotalSales: 999 };
  const before = structuredClone(raw);
  const record = normalizeServiceTitanTechnician(raw);
  assert.deepEqual(raw, before);
  assert.deepEqual({ id: record.id, name: record.name, shortName: record.shortName, initials: record.initials }, technicians[0]);
  assert.deepEqual([record.kpis.revenue.value, record.kpis.opportunities.value, record.kpis.techLeads.value], [848, 12, 0]);
  assert.deepEqual([record.kpis.membershipsSold.value, record.kpis.membershipsSold.dataQuality], [2, "confirmed"]);
  assert.deepEqual([record.kpis.closingRate.value, record.kpis.closingRate.hasData, record.kpis.closingRate.dataQuality], [43, true, "confirmed"]);
  assert.equal(JSON.stringify(record).includes("phone"), false);
  assert.equal(JSON.stringify(record).includes("CompletedRevenue"), false);
});

test("missing, unresolved, and zero values remain semantically distinct", () => {
  const record = normalizeServiceTitanTechnician({ TechnicianId: 3841, CompletedRevenue: 0, Opportunity: null, CloseRate: undefined });
  assert.deepEqual([record.kpis.revenue.value, record.kpis.revenue.hasData], [0, true]);
  assert.deepEqual([record.kpis.opportunities.value, record.kpis.opportunities.hasData], [null, false]);
  for (const id of ["billableServiceCalls", "serviceRevenue", "leadConversionRate", "installs", "installAverageTicket", "installRevenue"])
    assert.deepEqual([record.kpis[id].value, record.kpis[id].hasData, record.kpis[id].dataQuality], [null, false, "unavailable"]);
  assert.equal(ratioToPercentage(0), 0);
  assert.equal(ratioToPercentage(0.5), 50);
});

test("mock-only explicit values are accepted without changing production mappings", () => {
  const record = normalizeServiceTitanTechnician({ TechnicianId: 3853 }, { mockValues: { installs: 0, installAverageTicket: null } });
  assert.deepEqual([record.kpis.installs.value, record.kpis.installs.hasData, record.kpis.installs.dataQuality], [0, true, "fallback"]);
  assert.equal(record.kpis.installAverageTicket.hasData, false);
});

test("goal engine resolves overrides and safely handles every progress boundary", () => {
  const config = { defaults: { revenue: 100 }, technicians: { "3841": { revenue: 200 } } };
  assert.equal(resolveGoal(3841, "revenue", config), 200);
  assert.equal(resolveGoal(3853, "revenue", config), 100);
  assert.deepEqual(calculateGoal({ value: 50, hasData: true }, 100), { goal: 100, percentComplete: 50, remaining: 50, reached: false });
  assert.deepEqual(calculateGoal({ value: 100, hasData: true }, 100), { goal: 100, percentComplete: 100, remaining: 0, reached: true });
  assert.deepEqual(calculateGoal({ value: 150, hasData: true }, 100), { goal: 100, percentComplete: 150, remaining: 0, reached: true });
  for (const goal of [null, 0, -1, NaN]) assert.deepEqual(calculateGoal({ value: 50, hasData: true }, goal), { goal: null, percentComplete: null, remaining: null, reached: false });
  assert.deepEqual(calculateGoal({ value: null, hasData: false }, 100), { goal: 100, percentComplete: null, remaining: null, reached: false });
  const source = [{ id: 1, kpis: { revenue: { value: 150, hasData: true } } }];
  assert.equal(applyGoals(source, { defaults: { revenue: 100 }, technicians: {} })[0].kpis.revenue.percentComplete, 150);
  assert.equal(source[0].kpis.revenue.goal, undefined);
});
