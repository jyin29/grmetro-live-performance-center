"use strict";
function arr(x){return Array.isArray(x)?x:[]} function lower(x){return String(x ?? "").trim().toLowerCase();}
function idSet(xs){return new Set(arr(xs).map(Number).filter(Number.isSafeInteger));}
function nameSet(xs){return new Set(arr(xs).map(lower).filter(Boolean));}
function patterns(xs){return arr(xs).map((p)=>p instanceof RegExp?p:new RegExp(String(p),"i"));}
function truthy(v){return v===true || v===1 || lower(v)==="true" || lower(v)==="yes";}
function statusCanceled(s){return /cancel/.test(lower(s));}
function statusCompleted(s){return /complete|done/.test(lower(s));}
function money(v){const n=Number(String(v ?? "").replace(/[$,]/g,""));return Number.isFinite(n)?n:null;}
function matches(rule, record){const id=Number(record.jobTypeId);const name=lower(record.jobTypeName);return (Number.isSafeInteger(id)&&idSet(rule.includedJobTypeIds).has(id))||nameSet(rule.includedJobTypeNames).has(name)||patterns(rule.includedNamePatterns).some((p)=>p.test(name));}
function excluded(rule, record){const id=Number(record.jobTypeId);const name=lower(record.jobTypeName);return (Number.isSafeInteger(id)&&idSet(rule.excludedJobTypeIds).has(id))||nameSet(rule.excludedJobTypeNames).has(name)||patterns(rule.excludedNamePatterns).some((p)=>p.test(name));}
function classifyJob(record, configuration={}){
 const cfg=configuration||{}; const service=cfg.service||{}; const install=cfg.install||{};
 if (statusCanceled(record.status) || truthy(record.isRecall)&&cfg.excludeRecalls!==false || truthy(record.isWarranty)&&cfg.excludeWarranty!==false || truthy(record.isNoCharge)&&cfg.excludeNoCharge!==false) return "excluded";
 if (excluded(service,record)||excluded(install,record)) return "excluded";
 const id=Number(record.jobTypeId); const sIds=idSet(service.includedJobTypeIds), iIds=idSet(install.includedJobTypeIds);
 if(Number.isSafeInteger(id)){ if(sIds.has(id)&&iIds.has(id)) return "ambiguous"; if(sIds.has(id)) return "service"; if(iIds.has(id)) return "install"; }
 const s=matches({...service,includedJobTypeIds:[]},record), i=matches({...install,includedJobTypeIds:[]},record);
 if(s&&i) return "ambiguous"; if(s) return "service"; if(i) return "install"; return "unknown";
}
module.exports={classifyJob, helpers:{truthy,statusCanceled,statusCompleted,money}};
