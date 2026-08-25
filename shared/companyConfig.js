"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_COMPANY_CONFIG_PATH = path.join(PROJECT_ROOT, "data", "company-config.json");

function resolveCompanyConfigPath(environment = process.env) {
  const configured = String(environment.COMPANY_CONFIG_PATH || "").trim();
  return configured ? path.resolve(PROJECT_ROOT, configured) : DEFAULT_COMPANY_CONFIG_PATH;
}

function emptyCompanyConfig() {
  return {
    company: { name: "", shortName: "" },
    serviceTitan: { businessUnitIds: [] },
    technicians: [],
    goals: { defaults: {}, technicians: {} },
    jobClassifications: null
  };
}

function loadCompanyConfig({ environment = process.env, required = false } = {}) {
  const configPath = resolveCompanyConfigPath(environment);
  if (!fs.existsSync(configPath)) {
    if (required) throw new Error(`Company configuration not found at ${configPath}. Copy data/company-config.example.json to data/company-config.json and fill in local values.`);
    return emptyCompanyConfig();
  }
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(configPath, "utf8")); }
  catch (error) { throw new Error(`Could not read company configuration at ${configPath}: ${error.message}`); }
  return {
    ...emptyCompanyConfig(),
    ...parsed,
    company: { ...emptyCompanyConfig().company, ...(parsed.company || {}) },
    serviceTitan: { ...emptyCompanyConfig().serviceTitan, ...(parsed.serviceTitan || {}) },
    goals: { ...emptyCompanyConfig().goals, ...(parsed.goals || {}) }
  };
}

module.exports = { DEFAULT_COMPANY_CONFIG_PATH, resolveCompanyConfigPath, emptyCompanyConfig, loadCompanyConfig };
