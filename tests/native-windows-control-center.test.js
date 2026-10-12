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
  assert.match(ui,/Start-NativeOperation 'restart-backend' \$controlScript/);
  assert.match(ui,/Start-NativeOperation 'restart-browser' \$controlScript/);
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

test("native activity history leaves wheel scrolling to the outer control center",()=>{
  const ui=read("scripts/windows/performance-center-launcher-v2.ps1");
  assert.match(ui,/\$activity\.IsHitTestVisible\s*=\s*\$false/);
  assert.match(ui,/SetVerticalScrollBarVisibility\(\$activity,\s*\[System\.Windows\.Controls\.ScrollBarVisibility\]::Disabled\)/);
  assert.match(ui,/SetCanContentScroll\(\$activity,\s*\$false\)/);
  assert.doesNotMatch(ui,/Add_(?:Preview)?MouseWheel/);
  assert.doesNotMatch(ui,/MouseWheel[^\r\n]*(?:\*|\/)[^\r\n]*\d/);
});
