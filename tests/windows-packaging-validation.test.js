const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Windows package isolation, reinstall preservation, WPF loading, and paths with spaces', {
  skip: process.platform !== 'win32',
  timeout: 120000,
}, () => {
  const result = spawnSync('powershell.exe', [
    '-STA', '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', path.join(__dirname, 'windows-packaging-validation.ps1'),
  ], { encoding: 'utf8', timeout: 110000, windowsHide: true });
  assert.equal(result.status, 0, `${result.error || ''}\n${result.stdout}\n${result.stderr}`);
});
