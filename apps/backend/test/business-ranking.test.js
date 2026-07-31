"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { rankKpis, sortByPrimaryKpi } = require("../src/data/rankingEngine");
const { validateWeights, calculateOverallScores } = require("../src/data/overallScoreEngine");

function records(values) {
  return values.map(([id, name, value, revenue = value], index) => ({ id, name, kpis: {
    test: { value, hasData: value !== null }, revenue: { value: revenue, hasData: revenue !== null, goal: 100 },
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

test("KPI ties use revenue and then alphabetical name", () => {
  let ranked = rankKpis(records([[1,"Zulu",10,20],[2,"Alpha",10,30],[3,"Beta",9,99]]));
  assert.deepEqual([...ranked].sort((a,b) => a.kpis.test.rank-b.kpis.test.rank).map((r) => r.id), [2,1,3]);
  ranked = rankKpis(records([[1,"Zulu",10,30],[2,"Alpha",10,30]]));
  assert.deepEqual([...ranked].sort((a,b) => a.kpis.test.rank-b.kpis.test.rank).map((r) => r.name), ["Alpha","Zulu"]);
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
  assert.deepEqual(calculateOverallScores(input, config), scored);
});
