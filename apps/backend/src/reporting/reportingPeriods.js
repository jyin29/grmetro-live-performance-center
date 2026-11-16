"use strict";

const PERIODS = Object.freeze(["today","yesterday","wtd","last-week","mtd","last-month","qtd","last-quarter","ytd","last-year","last-7-days","last-30-days"]);
const PERIOD_LABELS = Object.freeze({ today:"Today",yesterday:"Yesterday",wtd:"Week to Date","last-week":"Last Week",mtd:"Month to Date","last-month":"Last Month",qtd:"Quarter to Date","last-quarter":"Last Quarter",ytd:"Year to Date","last-year":"Last Year","last-7-days":"Last 7 Days","last-30-days":"Last 30 Days" });
const PERIOD_SHORT_LABELS = Object.freeze({ today:"Today",yesterday:"Yesterday",wtd:"WTD","last-week":"Last Week",mtd:"MTD","last-month":"Last Month",qtd:"QTD","last-quarter":"Last Quarter",ytd:"YTD","last-year":"Last Year","last-7-days":"7 Days","last-30-days":"30 Days" });
const DEFAULT_GOAL_SCHEDULE = Object.freeze({ workingWeekdays:Object.freeze([1,2,3,4,5]),includedDates:Object.freeze([]),excludedDates:Object.freeze([]) });

function parseIsoDate(value){
  if(typeof value!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))throw new TypeError("Reporting dates must use YYYY-MM-DD.");
  const date=new Date(`${value}T00:00:00.000Z`);
  if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)throw new TypeError("Reporting date is invalid.");
  return date;
}
function isoDate(date){return date.toISOString().slice(0,10);}
function dateList(from,to){const start=parseIsoDate(from),end=parseIsoDate(to);if(start>end)throw new TypeError("Reporting date range is reversed.");const values=[];for(let current=start;current<=end;current=new Date(current.getTime()+86400000))values.push(isoDate(current));return values;}
function normalizeDateSet(values,label){if(!Array.isArray(values))throw new TypeError(`${label} must be an array.`);const result=[];for(const value of values){parseIsoDate(value);if(!result.includes(value))result.push(value);}return result.sort();}
function normalizeGoalSchedule(input={}){
  const weekdays=input.workingWeekdays??DEFAULT_GOAL_SCHEDULE.workingWeekdays;
  if(!Array.isArray(weekdays)||!weekdays.length||weekdays.some((day)=>!Number.isInteger(day)||day<0||day>6)||new Set(weekdays).size!==weekdays.length)throw new TypeError("Goal working weekdays must contain unique integers from 0 through 6.");
  return {workingWeekdays:[...weekdays].sort(),includedDates:normalizeDateSet(input.includedDates??[],"Goal included dates"),excludedDates:normalizeDateSet(input.excludedDates??[],"Goal excluded dates")};
}
function workingDates(dateRange,schedule=DEFAULT_GOAL_SCHEDULE){
  if(!dateRange?.from||!dateRange?.to)throw new TypeError("Goal aggregation requires a reporting date range.");
  const normalized=normalizeGoalSchedule(schedule),included=new Set(normalized.includedDates),excluded=new Set(normalized.excludedDates);
  return dateList(dateRange.from,dateRange.to).filter((value)=>included.has(value)||(!excluded.has(value)&&normalized.workingWeekdays.includes(parseIsoDate(value).getUTCDay())));
}
function formatDate(value,options={}){return new Intl.DateTimeFormat("en-US",{timeZone:"UTC",month:"short",day:"numeric",...options}).format(parseIsoDate(value));}
function dateRangeLabel(dateRange){
  if(!dateRange?.from||!dateRange?.to)return"Date unavailable";
  if(dateRange.from===dateRange.to)return formatDate(dateRange.from,{year:"numeric"});
  const from=parseIsoDate(dateRange.from),to=parseIsoDate(dateRange.to),sameYear=from.getUTCFullYear()===to.getUTCFullYear(),sameMonth=sameYear&&from.getUTCMonth()===to.getUTCMonth();
  if(sameMonth)return `${formatDate(dateRange.from)}–${to.getUTCDate()}, ${to.getUTCFullYear()}`;
  return `${formatDate(dateRange.from,{year:sameYear?undefined:"numeric"})} – ${formatDate(dateRange.to,{year:"numeric"})}`;
}
function describeReportingPeriod(dateRange,schedule=DEFAULT_GOAL_SCHEDULE){
  const period=PERIODS.includes(dateRange?.period)?dateRange.period:"today";
  const applicableDates=workingDates(dateRange,schedule);
  return {id:period,label:PERIOD_LABELS[period],shortLabel:PERIOD_SHORT_LABELS[period],from:dateRange.from,to:dateRange.to,dateRangeLabel:dateRangeLabel(dateRange),workingDayCount:applicableDates.length,workingDates:applicableDates};
}

module.exports={DEFAULT_GOAL_SCHEDULE,PERIODS,PERIOD_LABELS,PERIOD_SHORT_LABELS,dateList,dateRangeLabel,describeReportingPeriod,normalizeGoalSchedule,workingDates};
