"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Windows control center routes through native v2 launcher",()=>{
  const host=read("scripts/windows/performance-center-launcher-host.ps1");
  assert.match(host,/performance-center-launcher-v2\.ps1/);
  assert.doesNotMatch(host,/Start-Process powershell\.exe -ArgumentList "-NoExit/);
});

test("operator actions use native confirmations and hidden workers",()=>{
  const ui=read("scripts/windows/performance-center-launcher-v2.ps1");
  assert.match(ui,/Confirm-GrMetroAction 'Restart Backend'/);
  assert.match(ui,/Confirm-GrMetroAction 'Restart ServiceTitan'/);
  assert.match(ui,/Run-HiddenWait \$controlScript/);
  assert.match(ui,/-WindowStyle','Hidden'/);
  assert.doesNotMatch(ui,/Run-Admin/);
  assert.doesNotMatch(ui,/Read-Host/);
});

test("remote diagnostics and logs stay inside native UI",()=>{
  const ui=read("scripts/windows/performance-center-launcher-v2.ps1");
  assert.match(ui,/Show-NativeRemoteAccess/);
  assert.match(ui,/Show-NativeDiagnostics/);
  assert.match(ui,/Show-NativeRecoveryLogs/);
  assert.doesNotMatch(ui,/Start-Process "http:\/\//);
  assert.doesNotMatch(ui,/Start-Process notepad\.exe/);
});
