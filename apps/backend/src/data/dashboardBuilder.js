"use strict";

const slides = require("../../../../shared/slides");
const kpis = require("../../../../shared/kpis");
const productionGoals = require("../../../../shared/goals");
const overallScore = require("../../../../shared/overallScore");
const { applyGoals } = require("./goalEngine");
const { rankKpis, sortByPrimaryKpi } = require("./rankingEngine");
const { calculateOverallScores } = require("./overallScoreEngine");
const { buildAxis } = require("./axis");
const { activeEvents } = require("./achievementEvents");
const businessRules = require("../../../../shared/businessRules");
const { evaluateBusinessRules } = require("../rules/businessRulesEngine");

// These are data groups, not presentation-slide IDs. The presentation registry was
// redesigned (revenue/sales/technicians/operations/recognition/spreadsheet), so never
// index GROUPS using shared/slides IDs.
const GROUPS = Object.freeze({
  revenue: ["revenue", "serviceRevenue", "installRevenue"],
  activity: ["billableServiceCalls", "opportunities", "techLeads", "marketedLeads", "membershipsSold", "installs"],
  performance: ["leadConversionRate", "closingRate"],
  "average-ticket": ["installAverageTicket", "installRevenue", "installs"]
});
const PRIMARY = Object.freeze({ revenue: "revenue", activity: "billableServiceCalls", performance: "closingRate", "average-ticket": "installAverageTicket" });
const GROUP_LABELS = Object.freeze({ revenue: "Revenue", activity: "Activity", performance: "Performance", "average-ticket": "Average Ticket" });

function publicOverall(overall) { const { score, ...safe } = overall; return safe; }
function metric(record,id){return record?.kpis?.[id] || {id,label:kpis[id]?.label||id,value:null,hasData:false,dataQuality:"unavailable",rank:null};}
function slideRows(records,slideId,axis){const metricIds=GROUPS[slideId]||[];const primary=PRIMARY[slideId];return sortByPrimaryKpi(records,primary).map(record=>({technicianId:record.id,name:record.name,shortName:record.shortName,initials:record.initials,primaryRank:metric(record,primary).rank,metrics:metricIds.map(id=>{const value=metric(record,id);return{...value,normalizedRatio:value.hasData&&axis.maximum>0?value.value/axis.maximum:null};})}));}

function buildDashboardPayload(normalizedRecords, options = {}) {
  const timestamp = new Date(options.now || new Date()).toISOString();
  const previous = Array.isArray(options.previousPayload?.technicians) ? options.previousPayload.technicians : [];
  const safeRecords = Array.isArray(normalizedRecords) ? normalizedRecords : [];
  let records = applyGoals(safeRecords, options.goals || productionGoals);
  records = rankKpis(records, previous);
  records = calculateOverallScores(records, options.overallScore || overallScore, previous);
  const generatedSlides = {};

  // Build KPI data groups independently from the UI slide registry. This fixes the
  // crash caused by GROUPS["sales"]/GROUPS["technicians"] being undefined.
  for (const [groupId, metricIds] of Object.entries(GROUPS)) {
    const primary = PRIMARY[groupId];
    const axisValues = records.flatMap(record => metricIds
      .filter(id => groupId !== "average-ticket" || id === "installAverageTicket")
      .map(id => metric(record,id).hasData ? metric(record,id).value : null));
    const axis = buildAxis(axisValues,{format:kpis[primary]?.format||"integer",percentage:groupId==="performance"});
    generatedSlides[groupId]={id:groupId,label:GROUP_LABELS[groupId],primaryKpiId:primary,
      metrics:metricIds.map(id=>({id,label:kpis[id]?.label||id,color:kpis[id]?.color||null})),axis,rows:slideRows(records,groupId,axis)};
  }

  const qualified = records.filter(record=>record.overall?.qualifies).sort((a,b)=>(a.overall.rank??Infinity)-(b.overall.rank??Infinity));
  const entries = qualified.slice(0,3).map(record=>({technicianId:record.id,name:record.name,shortName:record.shortName,initials:record.initials,...publicOverall(record.overall),kpis:Object.fromEntries(["revenue","billableServiceCalls","closingRate","leadConversionRate","installs","installAverageTicket"].map(id=>[id,metric(record,id)]))}));
  while(entries.length<3)entries.push({placeholder:true,status:"insufficient-data"});
  const recognitionSlide=slides.find(slide=>slide.id==="recognition");
  generatedSlides["top-three"]={...(recognitionSlide||{id:"top-three",label:"Top Three"}),entries};

  const configuredBusinessRules=options.businessRules||businessRules;
  const configuredRules=Array.isArray(configuredBusinessRules?.rules)?configuredBusinessRules.rules:businessRules.rules;
  const configuredSettings={...businessRules.settings,...(configuredBusinessRules?.settings||{})};
  const ruleResult=evaluateBusinessRules({rules:configuredRules,current:records,previous,now:timestamp,eventDurationMilliseconds:configuredSettings.eventDurationMilliseconds});
  const newEvents=ruleResult.events;
  const events=activeEvents([...(Array.isArray(options.previousPayload?.events)?options.previousPayload.events:[]),...newEvents],timestamp);
  return {version:1,generatedAt:timestamp,refreshedAt:options.refreshedAt||timestamp,rotationEpoch:options.rotationEpoch||timestamp,status:options.status||{cache:"fresh"},technicians:records.map(record=>({...record,overall:publicOverall(record.overall)})),slides:generatedSlides,overallTopThree:entries,events,managementInsights:ruleResult.managementInsights.slice(0,configuredSettings.maximumAttentionItems)};
}
module.exports={GROUPS,PRIMARY,buildDashboardPayload};
