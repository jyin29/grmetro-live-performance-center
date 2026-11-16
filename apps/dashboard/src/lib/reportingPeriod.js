const LABELS={today:"Today",yesterday:"Yesterday",wtd:"Week to Date","last-week":"Last Week",mtd:"Month to Date","last-month":"Last Month",qtd:"Quarter to Date","last-quarter":"Last Quarter",ytd:"Year to Date","last-year":"Last Year","last-7-days":"Last 7 Days","last-30-days":"Last 30 Days"};
const SHORT={today:"Today",yesterday:"Yesterday",wtd:"WTD","last-week":"Last Week",mtd:"MTD","last-month":"Last Month",qtd:"QTD","last-quarter":"Last Quarter",ytd:"YTD","last-year":"Last Year","last-7-days":"7 Days","last-30-days":"30 Days"};

function fallbackDateRange(data){
  const range=data?.dateRange;if(!range?.from||!range?.to)return"Date unavailable";
  const format=value=>new Intl.DateTimeFormat("en-US",{timeZone:"UTC",month:"short",day:"numeric",year:"numeric"}).format(new Date(`${value}T00:00:00Z`));
  return range.from===range.to?format(range.from):`${format(range.from)} – ${format(range.to)}`;
}

export function reportingPeriod(data={}){
  const id=data.reportingPeriod?.id||data.period||"today";
  return {id,label:data.reportingPeriod?.label||LABELS[id]||"Current Period",shortLabel:data.reportingPeriod?.shortLabel||SHORT[id]||LABELS[id]||"Period",dateRangeLabel:data.reportingPeriod?.dateRangeLabel||fallbackDateRange(data),workingDayCount:data.reportingPeriod?.workingDayCount??null};
}
