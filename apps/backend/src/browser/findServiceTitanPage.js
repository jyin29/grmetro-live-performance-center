"use strict";

const { BrowserManagerError } = require("./browserErrors");

const SERVICE_TITAN_HOST = "go.servicetitan.com";
const UNAUTHENTICATED_PATH = /(?:^|[\/#?_-])(login|logout|sign[-_]?in|authentication|authorize)(?:[\/#?&=_-]|$)/i;
const MODULAR_DASHBOARD_ROUTE = "/new/dashboards/modular-dashboard";
const TECHNICIAN_SCORECARD_ROUTE = "/new/dashboards/technician-scorecard/";

function pageUrl(page) {
  if (!page || (typeof page.isClosed === "function" && page.isClosed())) return null;
  try { return new URL(page.url()); } catch { return null; }
}

function isServiceTitan(url) {
  return url.hostname.toLowerCase() === SERVICE_TITAN_HOST;
}

function appearsUnauthenticated(url) {
  return UNAUTHENTICATED_PATH.test(`${url.pathname}${url.hash}${url.search}`);
}

function serviceTitanRoute(url) {
  // ServiceTitan is hash-routed. URL.hash includes the leading '#', so strip it
  // before comparing with routes such as /new/dashboards/modular-dashboard.
  const hash = String(url.hash || "").replace(/^#/, "");
  return (hash || `${url.pathname || ""}${url.search || ""}`).toLowerCase();
}

function dashboardKind(url) {
  const route = serviceTitanRoute(url);
  if (route.startsWith(TECHNICIAN_SCORECARD_ROUTE)) return "technician-scorecard";
  if (route.startsWith(MODULAR_DASHBOARD_ROUTE)) return "modular-dashboard";
  return null;
}

function findServiceTitanPage(browser) {
  const candidates = [];
  let sawUnauthenticated = false;
  for (const context of browser?.contexts?.() || []) {
    for (const page of context.pages?.() || []) {
      const url = pageUrl(page);
      if (!url || !isServiceTitan(url)) continue;
      if (appearsUnauthenticated(url)) { sawUnauthenticated = true; continue; }
      const kind = dashboardKind(url);
      if (!kind) continue;
      candidates.push({ page, kind });
    }
  }
  const selected = candidates.find(({ kind }) => kind === "technician-scorecard")
    || candidates.find(({ kind }) => kind === "modular-dashboard");
  if (selected && !(typeof selected.page.isClosed === "function" && selected.page.isClosed())) return selected.page;
  throw new BrowserManagerError(sawUnauthenticated ? "SERVICE_TITAN_AUTH_REQUIRED" : "SERVICE_TITAN_PAGE_NOT_FOUND");
}

module.exports = { SERVICE_TITAN_HOST, MODULAR_DASHBOARD_ROUTE, TECHNICIAN_SCORECARD_ROUTE, appearsUnauthenticated, serviceTitanRoute, dashboardKind, findServiceTitanPage };
