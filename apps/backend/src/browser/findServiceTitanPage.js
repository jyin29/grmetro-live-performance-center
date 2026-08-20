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

function pageUrl(page) {
  const raw = rawPageUrl(page);
  if (!raw) return null;
  try { return new URL(raw); } catch { return null; }
}

function isServiceTitan(url) {
  return Boolean(url && url.hostname.toLowerCase() === SERVICE_TITAN_HOST);
}

function appearsUnauthenticated(url) {
  return Boolean(url && UNAUTHENTICATED_PATH.test(`${url.pathname}${url.hash}${url.search}`));
}

function serviceTitanRoute(url) {
  if (!url) return "";
  const hash = String(url.hash || "").replace(/^#/, "");
  return (hash || `${url.pathname || ""}${url.search || ""}`).toLowerCase();
}

function dashboardKind(url, raw = "") {
  const route = serviceTitanRoute(url);
  const text = `${route} ${String(raw).toLowerCase()}`;
  if (text.includes("/new/dashboards/technician-scorecard/")) return "technician-scorecard";
  if (text.includes("/new/dashboards/modular-dashboard")) return "modular-dashboard";
  return null;
}

function findServiceTitanPage(browser) {
  const candidates = [];
  let sawUnauthenticated = false;
  const seen = [];
  for (const context of browser?.contexts?.() || []) {
    for (const page of context.pages?.() || []) {
      const raw = rawPageUrl(page);
      const url = pageUrl(page);
      if (!url || !isServiceTitan(url)) continue;
      seen.push(raw);
      if (appearsUnauthenticated(url)) { sawUnauthenticated = true; continue; }
      const kind = dashboardKind(url, raw);
      if (!kind) continue;
      candidates.push({ page, kind, raw });
    }
  }
  const selected = candidates.find(({ kind }) => kind === "technician-scorecard")
    || candidates.find(({ kind }) => kind === "modular-dashboard");
  if (selected && !(typeof selected.page.isClosed === "function" && selected.page.isClosed())) return selected.page;
  const error = new BrowserManagerError(sawUnauthenticated ? "SERVICE_TITAN_AUTH_REQUIRED" : "SERVICE_TITAN_PAGE_NOT_FOUND");
  error.seenServiceTitanUrls = seen;
  throw error;
}

module.exports = { SERVICE_TITAN_HOST, MODULAR_DASHBOARD_ROUTE, TECHNICIAN_SCORECARD_ROUTE, appearsUnauthenticated, serviceTitanRoute, dashboardKind, findServiceTitanPage };
