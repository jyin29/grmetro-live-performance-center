"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const technicians = require("../../../shared/technicians");
const { isTechnicianExcluded } = require("../../../shared/dashboardVisibility");
const { isValidTechnicianId, isVisibleTechnicianId, isValidRemoteSelection } = require("../../../shared/validation");
const { projectDashboardPayload } = require("../src/data/dashboardPresentation");
const { SpreadsheetSlideStore } = require("../src/settings/spreadsheetSlideStore");

const hidden = technicians.find((technician) => isTechnicianExcluded(technician.id));
const visible = technicians.filter((technician) => !isTechnicianExcluded(technician.id));

function metric(value, rank) {
  return { id: "revenue", label: "Revenue", value, hasData: true, dataQuality: "confirmed", rank, rankLabel: `#${rank}`, tied: false, tieSize: 1, previousRank: rank, rankChange: 0 };
}

function record(technician, rank, value) {
  return { ...technician, kpis: { revenue: metric(value, rank) }, overall: { qualifies: true, status: "qualified", rank, rankLabel: `#${rank}`, tied: false, tieSize: 1, previousRank: rank, rankChange: 0 } };
}

test("stable-ID presentation exclusion preserves source records and compacts visible ranks", () => {
  assert.ok(hidden, "the centralized policy must resolve one configured technician");
  assert.equal(isValidTechnicianId(hidden.id), true);
  assert.equal(isVisibleTechnicianId(hidden.id), false);
  assert.equal(isValidRemoteSelection({ technicianId: hidden.id }), false);
  const ordered = [visible[0], hidden, ...visible.slice(1)];
  const records = ordered.map((technician, index) => record(technician, index + 1, 5000 - index * 500));
  const payload = {
    technicians: records,
    slides: {
      revenue: { id: "revenue", primaryKpiId: "revenue", axis: { maximum: 5000 }, rows: records.map((technician) => ({ technicianId: technician.id, name: technician.name, primaryRank: technician.kpis.revenue.rank, metrics: [{ ...technician.kpis.revenue, normalizedRatio: technician.kpis.revenue.value / 5000 }] })) },
      "top-three": { id: "top-three", entries: records.slice(0, 3) }
    },
    overallTopThree: records.slice(0, 3),
    events: [{ technicianId: hidden.id, type: "new-leader" }, { technicianId: visible[0].id, type: "new-leader" }],
    managementInsights: [{ technicianId: hidden.id, id: "hidden" }, { technicianId: visible[0].id, id: "visible" }],
    historicalComparison: { technicians: Object.fromEntries(records.map((technician) => [technician.id, { available: true }])) },
    historicalTrends: { technicians: Object.fromEntries(records.map((technician) => [technician.id, { available: true }])) },
    companyTotals: { revenue: 15000 }
  };
  const projected = projectDashboardPayload(payload);
  assert.equal(payload.technicians.length, 5, "the cached source payload remains intact");
  assert.equal(payload.slides.revenue.rows.length, 5, "source slide rows remain intact");
  assert.deepEqual(projected.technicians.map(({ id }) => id), visible.map(({ id }) => id));
  assert.deepEqual(projected.technicians.map((technician) => technician.kpis.revenue.rank), [1, 2, 3, 4]);
  assert.deepEqual(projected.technicians.map((technician) => technician.overall.rank), [1, 2, 3, 4]);
  assert.deepEqual(projected.slides.revenue.rows.map((row) => row.primaryRank), [1, 2, 3, 4]);
  assert.equal(projected.overallTopThree.some((entry) => entry.technicianId === hidden.id), false);
  assert.equal(projected.events.length, 1);
  assert.equal(projected.managementInsights.length, 1);
  assert.equal(Object.hasOwn(projected.historicalComparison.technicians, hidden.id), false);
  assert.equal(Object.hasOwn(projected.historicalTrends.technicians, hidden.id), false);
  assert.deepEqual(projected.companyTotals, payload.companyTotals);
  const sameNameDifferentId = record({ ...hidden, id: 999999999 }, 1, 1000);
  assert.equal(projectDashboardPayload({ technicians: [sameNameDifferentId], slides: {} }).technicians.length, 1, "dashboard exclusion is never a name match");
});

test("spreadsheet projection removes only the matching identity row before pagination", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-visible-sheet-"));
  try {
    const idPath = path.join(directory, "by-id.json");
    const idRows = [{ employeeId: String(hidden.id), technician: hidden.name }, ...Array.from({ length: 14 }, (_, index) => ({ employeeId: String(900000000 + index), technician: index === 0 ? hidden.name : `Synthetic ${index + 1}` }))];
    fs.writeFileSync(idPath, JSON.stringify({ enabled: true, title: "Synthetic", subtitle: "Test", columns: [
      { id: "employeeId", label: "Employee ID", type: "text", metric: null }, { id: "technician", label: "Technician", type: "text", metric: "technician" }
    ], rows: idRows, metrics: [], sourceRowCount: idRows.length }), "utf8");
    const idStore = new SpreadsheetSlideStore({ filePath: idPath });
    assert.equal(idStore.getPublicState().slide.rows.length, 14);
    assert.equal(idStore.getPublicState().slide.rows.some((row) => row.technician === hidden.name), true, "a different stable ID is not removed by its name");
    assert.equal(idStore.getPagination().pageCount, 1, "filtering occurs before continuation pagination");
    assert.equal(JSON.parse(fs.readFileSync(idPath, "utf8")).rows.length, 15, "stored spreadsheet data is preserved");

    const namePath = path.join(directory, "by-name.json");
    const nameRows = [{ technician: hidden.name }, { technician: `${hidden.name} Jr` }, { technician: visible[0].name }];
    fs.writeFileSync(namePath, JSON.stringify({ enabled: true, title: "Synthetic", subtitle: "Test", columns: [
      { id: "technician", label: "Technician", type: "text", metric: "technician" }
    ], rows: nameRows, metrics: [], sourceRowCount: nameRows.length }), "utf8");
    const nameStore = new SpreadsheetSlideStore({ filePath: namePath });
    assert.deepEqual(nameStore.getPublicState().slide.rows.map((row) => row.technician), [`${hidden.name} Jr`, visible[0].name]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
