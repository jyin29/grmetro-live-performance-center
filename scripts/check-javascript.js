"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function collectJavaScriptFiles(directory) {
  const files = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectJavaScriptFiles(entryPath));
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".js") files.push(entryPath);
  }

  return files;
}

function checkJavaScript(targetArgument, { output = console } = {}) {
  if (!targetArgument) {
    output.error("JavaScript syntax check failed: supply a target directory.");
    return false;
  }

  const targetDirectory = path.resolve(targetArgument);
  let targetStat;
  try {
    targetStat = fs.statSync(targetDirectory);
  } catch (error) {
    if (error.code === "ENOENT") {
      output.error(`JavaScript syntax check failed: target directory does not exist: ${targetDirectory}`);
      return false;
    }
    output.error(`JavaScript syntax check failed: cannot access target directory: ${targetDirectory}`);
    return false;
  }

  if (!targetStat.isDirectory()) {
    output.error(`JavaScript syntax check failed: target is not a directory: ${targetDirectory}`);
    return false;
  }

  let files;
  try {
    files = collectJavaScriptFiles(targetDirectory).sort((left, right) => left.localeCompare(right));
  } catch {
    output.error(`JavaScript syntax check failed: cannot scan target directory: ${targetDirectory}`);
    return false;
  }

  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
      output.error(`JavaScript syntax check failed: ${file}`);
      if (result.stderr) output.error(result.stderr.trimEnd());
      if (result.error) output.error(result.error.message);
      return false;
    }
  }

  output.log(`JavaScript syntax check passed for ${files.length} file(s) in ${targetDirectory}`);
  return true;
}

if (require.main === module) {
  if (!checkJavaScript(process.argv[2])) process.exitCode = 1;
}

module.exports = { checkJavaScript, collectJavaScriptFiles };
