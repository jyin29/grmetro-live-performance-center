"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const technicians = require("../shared/technicians");
const kpis = require("../shared/kpis");
const slides = require("../shared/slides");
const televisions = require("../shared/televisions");
const goals = require("../shared/goals");
const classifications = require("../shared/jobClassifications");
const constants = require("../shared/constants");
const validation = require("../shared/validation");

test("approved shared configuration has the required fixed cardinality and order", () => {
  assert.deepEqual(technicians.map(({ id }) => id), [134926818, 3841, 3853, 133469538, 127491426]);
  assert.deepEqual(Object.keys(kpis), [
    "revenue", "billableServiceCalls", "serviceRevenue", "opportunities", "leadConversionRate",
    "techLeads", "marketedLeads", "closingRate", "installs", "installAverageTicket", "installRevenue"
  ]);
  assert.deepEqual(slides.map(({ id, durationSeconds }) => [id, durationSeconds]), [
    ["revenue", 15], ["activity", 15], ["performance", 15],
    ["average-ticket", 15], ["top-three", 25]
  ]);
});

test("configured identifier validators accept known IDs and reject unknown or malformed IDs", () => {
  assert.equal(validation.isValidTvId("tv-1"), true);
  assert.equal(validation.isValidTvId("TV-1"), false);
  assert.equal(validation.isValidTvId("unknown-tv"), false);
  assert.equal(validation.isValidTechnicianId(134926818), true);
  assert.equal(validation.isValidTechnicianId("134926818"), true);
  assert.equal(validation.isValidTechnicianId("not-an-id"), false);
  assert.equal(validation.isValidTechnicianId(999), false);
  assert.equal(validation.isValidKpiId("revenue"), true);
  assert.equal(validation.isValidKpiId("completedJobs"), false);
  assert.equal(validation.isValidSlideId("top-three"), true);
  assert.equal(validation.isValidSlideId("experimental"), false);
});

test("remote selection permits either independent selection or both, but never neither", () => {
  assert.equal(validation.isValidRemoteSelection({ technicianId: 3841 }), true);
  assert.equal(validation.isValidRemoteSelection({ kpiId: "closingRate" }), true);
  assert.equal(validation.isValidRemoteSelection({ technicianId: "3853", kpiId: "revenue" }), true);
  assert.equal(validation.isValidRemoteSelection({}), false);
  assert.equal(validation.isValidRemoteSelection({ technicianId: null, kpiId: null }), false);
  assert.equal(validation.isValidRemoteSelection({ technicianId: 999 }), false);
  assert.equal(validation.isValidRemoteSelection({ kpiId: "unknown" }), false);
  assert.equal(validation.isValidRemoteSelection(null), false);
  assert.equal(validation.isValidRemoteSelection([]), false);
});

test("technician configuration validation detects cardinality and duplicate IDs", () => {
  assert.deepEqual(validation.validateTechnicianConfiguration(), []);
  assert.match(validation.validateTechnicianConfiguration(technicians.slice(0, 4))[0], /Exactly five/);
  const duplicate = technicians.map((technician) => ({ ...technician }));
  duplicate[4].id = duplicate[0].id;
  assert.equal(validation.validateTechnicianConfiguration(duplicate).some((error) => /unique/.test(error)), true);
});

test("television configuration validation detects missing, duplicate, and non-URL-safe IDs", () => {
  assert.deepEqual(validation.validateTelevisionConfiguration(), []);
  assert.equal(validation.validateTelevisionConfiguration([]).some((error) => /At least one/.test(error)), true);
  assert.equal(validation.validateTelevisionConfiguration([{ id: "tv-1" }, { id: "tv-1" }]).some((error) => /unique/.test(error)), true);
  for (const id of ["TV-1", "tv room", "-tv", "tv_"]) {
    assert.equal(validation.validateTelevisionConfiguration([{ id }]).some((error) => /URL-safe/.test(error)), true, id);
  }
});

test("KPI configuration validation detects count and stable-ID mismatches", () => {
  assert.deepEqual(validation.validateKpiConfiguration(), []);
  assert.equal(validation.validateKpiConfiguration({ revenue: kpis.revenue }).some((error) => /eleven/.test(error)), true);
  const mismatched = { ...kpis, revenue: { ...kpis.revenue, id: "wrong" } };
  assert.equal(validation.validateKpiConfiguration(mismatched).some((error) => /stable ID/.test(error)), true);
});

test("slide configuration validation enforces count, approved order, and durations", () => {
  assert.deepEqual(validation.validateSlideConfiguration(), []);
  assert.equal(validation.validateSlideConfiguration(slides.slice(0, 4)).some((error) => /five/.test(error)), true);
  assert.equal(validation.validateSlideConfiguration([...slides].reverse()).some((error) => /order/.test(error)), true);
  const wrongDuration = slides.map((slide) => ({ ...slide }));
  wrongDuration[0].durationSeconds = 25;
  assert.equal(validation.validateSlideConfiguration(wrongDuration).some((error) => /durations/.test(error)), true);
});

test("goal validation accepts null goals and rejects unknown KPI and technician IDs", () => {
  assert.deepEqual(validation.validateGoalConfiguration(goals), []);
  assert.equal(Object.values(goals.defaults).every((goal) => goal === null), true);
  assert.match(validation.validateGoalConfiguration(null)[0], /object/);
  assert.match(validation.validateGoalConfiguration({ defaults: { unknown: null }, technicians: {} })[0], /Unknown default goal KPI ID/);
  assert.equal(validation.validateGoalConfiguration({
    defaults: {}, technicians: { "3841": { unknown: 1 }, "999": {} }
  }).some((error) => /Unknown technician goal KPI ID/.test(error)), true);
  assert.equal(validation.validateGoalConfiguration({
    defaults: {}, technicians: { "999": {} }
  }).some((error) => /Unknown technician goal ID/.test(error)), true);
});

test("unresolved classifications stay empty and explicitly production-blocking", () => {
  assert.equal(classifications.productionReady, false);
  assert.match(classifications.unresolvedReason, /validation/);
  for (const group of [classifications.service, classifications.install]) {
    for (const value of Object.values(group)) assert.deepEqual(value, []);
  }
});

test("shared constants expose only approved modes, events, default slide, and clients", () => {
  assert.deepEqual(Object.values(constants.TV_MODES), ["live", "remote", "returning"]);
  assert.deepEqual(Object.values(constants.WS_EVENTS), ["dashboard:update", "tv:update", "connection:status"]);
  assert.equal(constants.DEFAULT_SLIDE_ID, "revenue");
  assert.deepEqual(Object.values(constants.CLIENT_TYPES), ["dashboard", "remote"]);
});
