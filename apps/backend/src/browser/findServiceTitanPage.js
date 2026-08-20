"use strict";

const { BrowserManagerError } = require("./browserErrors");

const SERVICE_TITAN_HOST = "go.servicetitan.com";
const UNAUTHENTICATED_PATH = /(?:^|[\/#?_-])(login|logout|sign[-_]?in|authentication|authorize)(?:[\/#?&=_-]|$)/i;
const MODULAR_DASHBOARD_ROUTE = "/new/dashboards/modular-dashboard";
const TECHNICIAN_SCORECARD_ROUTE = "/new/dashboards/technician-scorecard/";

function rawPageUrl(page) {
  if (!page || (typeof page.isClosed === "function" && page.isClosed())) return "";
  try { return String(page.url() || ""); } catch { return ""; }
}
function pageUrl(page) { const raw=rawPageUrl(page); if(!raw)return null; try{return new URL(raw);}catch{return null;} }
function isServiceTitan(url) { return Boolean(url && url.hostname.toLowerCase() === SERVICE_TITAN_HOST); }
function appearsUnauthenticated(url) { return Boolean(url && UNAUTHENTICATED_PATH.test(`${url.pathname}${url.hash}${url.search}`)); }
function serviceTitanRoute(url) { if(!url)return ""; const hash=String(url.hash||"").replace(/^#/,""); return (hash||`${url.pathname||""}${url.search||""}`).toLowerCase(); }
function dashboardKind(url,raw="") { const text=`${serviceTitanRoute(url)} ${String(raw).toLowerCase()}`; if(text.includes(TECHNICIAN_SCORECARD_ROUTE))return "technician-scorecard"; if(text.includes(MODULAR_DASHBOARD_ROUTE))return "modular-dashboard"; return null; }
function isSupportedDashboardPage(page) { const raw=rawPageUrl(page),url=pageUrl(page); return Boolean(url&&isServiceTitan(url)&&!appearsUnauthenticated(url)&&dashboardKind(url,raw)); }

function findServiceTitanPage(browser,{preferredPage=null}={}) {
  // Sticky selection: once BrowserManager has a valid dashboard tab, keep it.
  // Opening/navigating unrelated ServiceTitan tabs must never steal the connection.
  if (isSupportedDashboardPage(preferredPage)) return preferredPage;
  const modular=[]; const scorecards=[]; let sawUnauthenticated=false;
  for(const context of browser?.contexts?.()||[]) for(const page of context.pages?.()||[]) {
    const raw=rawPageUrl(page),url=pageUrl(page); if(!url||!isServiceTitan(url))continue;
    if(appearsUnauthenticated(url)){sawUnauthenticated=true;continue;}
    const kind=dashboardKind(url,raw); if(kind==="modular-dashboard")modular.push(page); else if(kind==="technician-scorecard")scorecards.push(page);
  }
  // Use the modular dashboard as the stable automatic anchor. Only use a technician
  // scorecard when no modular-dashboard tab exists. Never use arbitrary ST pages.
  const selected=modular[0]||scorecards[0];
  if(selected&&!selected.isClosed?.())return selected;
  throw new BrowserManagerError(sawUnauthenticated?"SERVICE_TITAN_AUTH_REQUIRED":"SERVICE_TITAN_PAGE_NOT_FOUND");
}

module.exports={SERVICE_TITAN_HOST,MODULAR_DASHBOARD_ROUTE,TECHNICIAN_SCORECARD_ROUTE,appearsUnauthenticated,serviceTitanRoute,dashboardKind,isSupportedDashboardPage,findServiceTitanPage};
