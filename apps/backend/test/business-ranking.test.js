"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { rankKpis, sortByPrimaryKpi } = require("../src/data/rankingEngine");
const { validateWeights, calculateOverallScores } = require("../src/data/overallScoreEngine");

function records(values) {
  return values.map(([id, name, value, revenue = value], index) => ({ id, name, kpis: {
    test: { value, hasData: value !== null }, revenue: { value: revenue, hasData: revenue !== null, dataQuality: "confirmed", goal: 100 },
    second: { value: 100 - index, hasData: true, goal: 100 }
  } }));
}

test("KPI rankings handle unique values, missing data, and prior movement deterministically", () => {
  const input = records([[1,"A",5],[2,"B",4],[3,"C",3],[4,"D",2],[5,"E",null]]);
  const previous = rankKpis(records([[1,"A",4],[2,"B",5],[3,"C",3],[4,"D",2],[5,"E",null]]));
  const ranked = rankKpis(input, previous);
  assert.deepEqual(ranked.map((r) => r.kpis.test.rank), [1,2,3,4,null]);
  assert.deepEqual(ranked.slice(0,2).map((r) => r.kpis.test.rankChange), [1,-1]);
  assert.deepEqual(rankKpis(input, previous), ranked);
  assert.deepEqual(sortByPrimaryKpi(ranked, "test").map((r) => r.id), [1,2,3,4,5]);
});

test("exact KPI ties use competition ranks while revenue and name only stabilize ordering", () => {
  let ranked = rankKpis(records([[1,"Zulu",10,20],[2,"Alpha",10,30],[3,"Beta",9,99]]));
  assert.deepEqual(ranked.map((record) => record.kpis.test.rank), [1, 1, 3]);
  assert.deepEqual(ranked.map((record) => record.kpis.test.rankLabel), ["T-1", "T-1", "#3"]);
  assert.deepEqual(sortByPrimaryKpi(ranked, "test").map((record) => record.id), [2, 1, 3]);
  ranked = rankKpis(records([[1,"Zulu",10,30],[2,"Alpha",10,30]]));
  assert.deepEqual(ranked.map((record) => record.kpis.test.rank), [1, 1]);
  assert.deepEqual(sortByPrimaryKpi(ranked, "test").map((record) => record.name), ["Alpha","Zulu"]);
});

test("Revenue uses truthful two-way and three-way competition ties followed by lower values", () => {
  const twoWay = rankKpis(records([[1,"Alex",0,1000],[2,"Charlie",0,1000],[3,"Dwight",0,500],[4,"Julio",0,200]]));
  assert.deepEqual(twoWay.map((record) => record.kpis.revenue.rank), [1, 1, 3, 4]);
  assert.deepEqual(twoWay.map((record) => record.kpis.revenue.rankLabel), ["T-1", "T-1", "#3", "#4"]);

  const threeWay = rankKpis(records([[1,"Alex",0,1000],[2,"Charlie",0,1000],[3,"Dwight",0,1000],[4,"Julio",0,200]]));
  assert.deepEqual(threeWay.map((record) => record.kpis.revenue.rank), [1, 1, 1, 4]);
  assert.deepEqual(threeWay.slice(0, 3).map((record) => record.kpis.revenue.tieSize), [3, 3, 3]);
});

test("all-zero confirmed Revenue ties do not change under deterministic card ordering", () => {
  const ranked = rankKpis(records([[5,"Shamon",0,0],[4,"Julio",0,0],[3,"Dwight",0,0],[2,"Charlie",0,0],[1,"Alex",0,0]]));
  assert.deepEqual(ranked.map((record) => record.kpis.revenue.rankLabel), ["T-1", "T-1", "T-1", "T-1", "T-1"]);
  assert.deepEqual(sortByPrimaryKpi(ranked, "revenue").map((record) => record.name), ["Alex", "Charlie", "Dwight", "Julio", "Shamon"]);
  assert.deepEqual(sortByPrimaryKpi(ranked, "revenue").map((record) => record.kpis.revenue.rank), [1, 1, 1, 1, 1]);
});

test("fallback Revenue remains unranked", () => {
  const input = records([[1,"Alex",0,100],[2,"Charlie",0,50]]);
  input[0].kpis.revenue.dataQuality = "fallback";
  const ranked = rankKpis(input);
  assert.equal(ranked[0].kpis.revenue.rank, null);
  assert.equal(ranked[0].kpis.revenue.rankLabel, null);
  assert.equal(ranked[1].kpis.revenue.rank, 1);
});

test("overall scoring validates weights, caps contributions, redistributes missing weight, and enforces coverage", () => {
  assert.equal(validateWeights({ a: 0.4, b: 0.6 }), 1);
  assert.throws(() => validateWeights({ a: 0.9 }), /1.0/);
  const config = { weights: { revenue: 0.5, second: 0.5 }, contributionCap: 1.5, minimumValidWeight: 0.5 };
  const input = records([[1,"A",0,300],[2,"B",0,100],[3,"C",0,null]]);
  input[0].kpis.second.value = 100;
  input[1].kpis.second = { value: null, hasData: false, goal: 100 };
  input[2].kpis.second = { value: 120, hasData: true, goal: 100 };
  const scored = calculateOverallScores(input, config);
  assert.equal(scored[0].overall.score, 1.25); // revenue contribution capped at 150%
  assert.equal(scored[1].overall.score, 1); // missing second KPI weight redistributed
  assert.equal(scored[2].overall.score, 1.2);
  assert.equal(scored.every((r) => r.overall.qualifies), true);
  const strict = calculateOverallScores(input, { ...config, minimumValidWeight: 0.6 });
  assert.equal(strict[1].overall.qualifies, false);
  assert.equal(strict[1].overall.rank, null);
  assert.equal(strict[1].overall.rankLabel, null);
  assert.deepEqual(calculateOverallScores(input, config), scored);
});

test("qualified equal overall scores tie while unqualified technicians remain explicitly unranked", () => {
  const input = records([[1,"Alex",0,100],[2,"Charlie",0,100],[3,"Dwight",0,null]]);
  input[1].kpis.second.value = input[0].kpis.second.value;
  input[2].kpis.second = { value: null, hasData: false, goal: 100 };
  const scored = calculateOverallScores(input, { weights: { revenue: 0.5, second: 0.5 }, contributionCap: 1.5, minimumValidWeight: 0.6 });
  assert.deepEqual(scored.slice(0, 2).map((record) => record.overall.rankLabel), ["T-1", "T-1"]);
  assert.equal(scored[2].overall.qualifies, false);
  assert.equal(scored[2].overall.rank, null);
});
