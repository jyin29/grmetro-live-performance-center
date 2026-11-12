const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

test('internal Authenticode infrastructure remains fail closed and secret free', () => {
  const repository = path.resolve(__dirname, '..');
  const policy = path.join(repository, 'scripts', 'windows', 'internal-authenticode-policy.json');
  const source = fs.readFileSync(path.join(repository, 'scripts', 'windows', 'authenticode-signing.ps1'), 'utf8');
  const trust = fs.readFileSync(path.join(repository, 'scripts', 'windows', 'install-internal-authenticode-trust.ps1'), 'utf8');
  const provisioning = fs.readFileSync(path.join(repository, 'scripts', 'windows', 'provision-internal-authenticode.ps1'), 'utf8');
  assert.match(source, /Code Signing EKU/);
  assert.match(source, /expires within/);
  assert.match(source, /TimestampServer/);
  assert.match(source, /HashAlgorithm SHA256/);
  assert.match(trust, /ConfirmTrustInstallation/);
  assert.match(trust, /WindowsBuiltInRole.*Administrator/);
  assert.match(provisioning, /KeyExportPolicy NonExportable/);
  assert.doesNotMatch([source, trust, provisioning].join('\n'), /Export-PfxCertificate|\.pfx/i);
  const document = JSON.parse(fs.readFileSync(policy, 'utf8'));
  assert.equal(document.schemaVersion, 1);
  assert.match(document.signingCertificateThumbprint, /^[A-F0-9]{40}$/);
  assert.match(document.rootCertificateThumbprint, /^[A-F0-9]{40}$/);
  assert.match(document.timestampUrl, /^https?:\/\//);
});

test('all internal Authenticode PowerShell scripts parse in Windows PowerShell 5.1', () => {
  const repository = path.resolve(__dirname, '..');
  const paths = [
    'scripts/windows/authenticode-signing.ps1',
    'scripts/windows/provision-internal-authenticode.ps1',
    'scripts/windows/install-internal-authenticode-trust.ps1',
  ].map((relative) => path.join(repository, relative));
  const command = paths.map((file) => `$null=[System.Management.Automation.Language.Parser]::ParseFile('${file.replaceAll("'", "''")}',[ref]$null,[ref]$errors);if($errors.Count){throw ($errors|Out-String)}`).join(';');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', `$errors=@();${command}`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
