"use strict";

const fs = require("node:fs");
const path = require("node:path");

function readReleaseIdentity({ root = path.resolve(__dirname, "../../.."), fallbackVersion = "1.0.0" } = {}) {
  const filePath = path.join(root, "scripts", "windows", "package-build.json");
  try {
    const metadata = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (metadata.schemaVersion !== 2 || typeof metadata.releaseVersion !== "string" || !/^\d{1,4}\.\d{1,2}\.\d{1,2}\.\d{1,4}$/.test(metadata.releaseVersion)) {
      throw new TypeError("Invalid packaged release identity.");
    }
    return Object.freeze({ applicationVersion: metadata.releaseVersion, buildVersion: metadata.commit || null, metadata });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return Object.freeze({ applicationVersion: `development-${fallbackVersion}`, buildVersion: null, metadata: null });
  }
}

module.exports = { readReleaseIdentity };
