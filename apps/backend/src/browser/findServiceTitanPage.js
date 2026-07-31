"use strict";

const { BrowserManagerError } = require("./browserErrors");

const SERVICE_TITAN_HOST = "go.servicetitan.com";
const UNAUTHENTICATED_PATH = /(?:^|[\/#?_-])(login|logout|sign[-_]?in|authentication|authorize)(?:[\/#?&=_-]|$)/i;

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

function findServiceTitanPage(browser) {
  const candidates = [];
  let sawUnauthenticated = false;
  for (const context of browser?.contexts?.() || []) {
    for (const page of context.pages?.() || []) {
      const url = pageUrl(page);
      if (!url || !isServiceTitan(url)) continue;
      if (appearsUnauthenticated(url)) { sawUnauthenticated = true; continue; }
      candidates.push({ page, scorecard: url.href.toLowerCase().includes("technician-scorecard") });
    }
  }
  const selected = candidates.find(({ scorecard }) => scorecard) || candidates[0];
  if (selected && !(typeof selected.page.isClosed === "function" && selected.page.isClosed())) return selected.page;
  throw new BrowserManagerError(sawUnauthenticated ? "SERVICE_TITAN_AUTH_REQUIRED" : "SERVICE_TITAN_PAGE_NOT_FOUND");
}

module.exports = { SERVICE_TITAN_HOST, appearsUnauthenticated, findServiceTitanPage };
