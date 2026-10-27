# GRMetro 2026.10.26.3 Post-Success Recovery

This procedure restores the legacy `1.0.0` / `d159cba` managed application files from the independently verified backup created by the INTERNAL-READY installer. It is for a reviewed rollback after the composite upgrade reported success. It is not part of normal automatic failure rollback.

The recovery changes only files listed by the legacy or current application manifests. It preserves the current `.env`, company configuration, goals, display settings, management dismissals, spreadsheet state, logs, autostart choice, firewall state, Update Host, Update State, shortcuts, and both Edge profiles. The external host and recovery-first shortcuts intentionally remain installed so interrupted application recovery can still be reached safely.

## Preconditions

1. Stop and investigate first if an application transaction already exists. Do not delete it.
2. Identify the exact backup under `%LOCALAPPDATA%\GRMetro\Legacy Upgrade Backups\before-2026.10.26.3-*` printed by the installer.
3. Require `application\` and `SHA256-INVENTORY.json` inside that backup.
4. Confirm the currently installed application is exactly `2026.10.26.3`.
5. Keep Defender and normal Windows security controls enabled.
6. Do not close, restart, migrate, or edit `C:\edge-dashboard-profile` or its Edge processes.
7. Copy the reviewed recovery kit to a local non-synchronized folder. Run commands from that folder.

## Read-only validation

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\restore-legacy-managed-backup.ps1 `
  -BackupRoot "$env:LOCALAPPDATA\GRMetro\Legacy Upgrade Backups\before-2026.10.26.3-<timestamp>" `
  -ExpectedCurrentVersion 2026.10.26.3 `
  -ExpectedLegacyCommit d159cba `
  -ValidateOnly
```

Require `Status = validated`, `ManagedFiles` greater than zero, and `RecoveryAction = none`. This verifies every backup byte, the legacy manifest/inventory identity, the installed current manifest, safe paths, and the absence of a pending transaction. It does not stop processes or write to the installation.

## Explicit restore

Run only after separate rollback authorization:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\restore-legacy-managed-backup.ps1 `
  -BackupRoot "$env:LOCALAPPDATA\GRMetro\Legacy Upgrade Backups\before-2026.10.26.3-<timestamp>" `
  -ExpectedCurrentVersion 2026.10.26.3 `
  -ExpectedLegacyCommit d159cba `
  -ConfirmRestore
```

The tool stages and hashes all legacy files, creates and verifies rollback data for the current managed application before process shutdown, stops only GRMetro-owned packaged processes, applies the legacy inventory, removes only current-version managed files absent from that inventory, verifies every restored hash, verifies all nonmanifest/private hashes, commits, and starts the installed application. Any ordinary apply or validation failure restores `2026.10.26.3` automatically.

## Interrupted recovery

If recovery is interrupted or reports a pending transaction, do not rerun the restore command and do not delete evidence. Run the recovery-only command after review:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\restore-legacy-managed-backup.ps1 -RecoverOnly
```

Recovery-only stops only GRMetro-owned application processes and inspects the version-2 journal. An `applying` or `applied` transaction uses verified current-version rollback files to restore `2026.10.26.3`; a `prepared` or already `completed` transaction requires cleanup only. It removes the resolved transaction and restarts only the captured prior GRMetro state. It does not touch Edge or updater-owned host/state paths.

## Verification and limitations

- Verify legacy identity `1.0.0` / `d159cba`, backend health, ServiceTitan connection, five TVs, phone remote, private settings, disabled autostart, firewall state, and absence of an application transaction.
- The recovery intentionally leaves the external Update Host, testing trust state, and host-targeted shortcuts installed. They are outside the legacy managed-file backup and remain a safe recovery-first launcher for the restored application.
- The backup excludes private nonmanifest data by design. Recovery preserves the current private data; it does not rewind settings or logs to upgrade-day values.
- A failure after the journal is marked `completed` is a cleanup/restart issue, not an automatic rollback condition. Preserve the transaction and inspect installed identity before acting.
- Automated fixtures cover success, corrupted backup refusal, apply rollback, private-state preservation, and interruption recovery. A real production rollback still requires a maintenance window and physical validation.
