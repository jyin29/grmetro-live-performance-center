"use strict";
const { classifyJob, helpers } = require("./jobClassifier");
function empty(q="unavailable", counts={}){return {value:null,hasData:false,dataQuality:q,includedRecordCount:0,excludedRecordCount:0,unknownRecordCount:0,ambiguousRecordCount:0,missingRequiredFieldCount:0,...counts};}
function baseCounts(){return {includedRecordCount:0,excludedRecordCount:0,unknownRecordCount:0,ambiguousRecordCount:0,missingRequiredFieldCount:0};}
function finish(value, counts, options={}){const hasMissing=counts.missingRequiredFieldCount>0; if(options.noData) return empty(hasMissing?"unavailable":"derived",counts); return {value,hasData:!hasMissing,dataQuality:hasMissing?"unavailable":"derived",...counts};}
function markClassification(counts, classification){if(classification==="excluded") counts.excludedRecordCount++; else if(classification==="unknown") counts.unknownRecordCount++; else if(classification==="ambiguous") counts.ambiguousRecordCount++;}
function deriveServiceInstallKpis(records, configuration={}){
 if(!configuration.classificationApproved) return { billableServiceCalls:empty(), serviceRevenue:empty(), installRevenue:empty(), installs:empty(), installAverageTicket:empty() };
 const counts={billableServiceCalls:baseCounts(),serviceRevenue:baseCounts(),installRevenue:baseCounts(),installs:baseCounts(),installAverageTicket:baseCounts()};
 let calls=0, serviceRevenue=0, installRevenue=0, installs=0, avgInstallRevenue=0, avgInstallCount=0;
 for(const original of records||[]){
  const r={...original}; const c=classifyJob(r,configuration);
  for(const key of Object.keys(counts)) markClassification(counts[key],c);
  if(c!=="service"&&c!=="install") continue;
  if(!helpers.statusCompleted(r.status,configuration)){for(const key of Object.keys(counts)) counts[key].excludedRecordCount++; continue;}
  if(c==="service"){
   const billable=helpers.tristate(r.isBillable); counts.billableServiceCalls.includedRecordCount++;
   if(billable===true) calls++; else if(billable===null) counts.billableServiceCalls.missingRequiredFieldCount++;
   const revenue=helpers.money(r.revenue); counts.serviceRevenue.includedRecordCount++;
   if(revenue===null) counts.serviceRevenue.missingRequiredFieldCount++; else serviceRevenue+=revenue;
  }
  if(c==="install"){
   counts.installs.includedRecordCount++; installs++;
   const revenue=helpers.money(r.revenue);
   counts.installRevenue.includedRecordCount++; counts.installAverageTicket.includedRecordCount++;
   if(revenue===null){counts.installRevenue.missingRequiredFieldCount++; counts.installAverageTicket.missingRequiredFieldCount++;}
   else {installRevenue+=revenue; avgInstallRevenue+=revenue; avgInstallCount++;}
  }
 }
 return {
  billableServiceCalls:finish(calls,counts.billableServiceCalls),
  serviceRevenue:finish(serviceRevenue,counts.serviceRevenue),
  installRevenue:finish(installRevenue,counts.installRevenue),
  installs:finish(installs,counts.installs),
  installAverageTicket:avgInstallCount>0?finish(avgInstallRevenue/avgInstallCount,counts.installAverageTicket):finish(null,counts.installAverageTicket,{noData:true})
 };
}
module.exports={deriveServiceInstallKpis};
