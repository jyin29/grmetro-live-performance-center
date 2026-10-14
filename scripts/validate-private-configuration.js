"use strict";

const fs = require("node:fs");
const path = require("node:path");

function result(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

try {
  const [environmentPath, installRoot, parserPath] = process.argv.slice(2);
  if (!environmentPath || !installRoot || !parserPath) throw new Error("missing-input");
  const dotenv = require(path.join(installRoot, "node_modules", "dotenv"));
  const environment = dotenv.parse(fs.readFileSync(environmentPath));
  const { parseTechnicianConfiguration } = require(parserPath);
  const technicians = parseTechnicianConfiguration(environment.SERVICETITAN_TECHNICIANS_JSON);
  if (!technicians?.length) throw new Error("empty-configuration");
  result({ ok: true, technicianCount: technicians.length });
} catch {
  result({ ok: false, code: "TECHNICIAN_CONFIGURATION_INCOMPATIBLE" });
  process.exitCode = 1;
}
