"use strict";
const { classifyJob, helpers } = require("./jobClassifier");
function empty(q="unavailable", counts={}){return {value:null,hasData:false,dataQuality:q,includedRecordCount:0,excludedRecordCount:0,unknownRecordCount:0,ambiguousRecordCount:0,...counts};}
function deriveServiceInstallKpis(records, configuration={}){
 const counts={includedRecordCount:0,excludedRecordCount:0,unknownRecordCount:0,ambiguousRecordCount:0};
 if(!configuration.classificationApproved) return { billableServiceCalls:empty(), serviceRevenue:empty(), installRevenue:empty(), installs:empty(), installAverageTicket:empty() };
 let calls=0, serviceRevenue=0, installRevenue=0, installs=0;
 for(const original of records||[]){const r={...original}; const c=classifyJob(r,configuration); if(c==="excluded"){counts.excludedRecordCount++;continue;} if(c==="unknown"){counts.unknownRecordCount++;continue;} if(c==="ambiguous"){counts.ambiguousRecordCount++;continue;} if(!helpers.statusCompleted(r.status)){counts.excludedRecordCount++;continue;} const revenue=helpers.money(r.revenue)??0; counts.includedRecordCount++; if(c==="service"){serviceRevenue+=revenue;if(helpers.truthy(r.isBillable)) calls++;} if(c==="install"){installRevenue+=revenue;installs++;}}
 const quality="derived"; const base={...counts,dataQuality:quality};
 return { billableServiceCalls:{value:calls,hasData:true,...base}, serviceRevenue:{value:serviceRevenue,hasData:true,...base}, installRevenue:{value:installRevenue,hasData:true,...base}, installs:{value:installs,hasData:true,...base}, installAverageTicket: installs>0?{value:installRevenue/installs,hasData:true,...base}:{...empty(quality,counts)} };
}
module.exports={deriveServiceInstallKpis};
