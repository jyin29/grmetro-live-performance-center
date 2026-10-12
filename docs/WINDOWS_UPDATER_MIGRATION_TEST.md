# GRMetro updater migration — second-PC operator checklist

This checklist is for a disposable or designated second Windows 10/11 test PC. Do not begin on the production GRMetro PC. Preserve every failure message and transaction directory before retrying.

## Test inputs

- A currently working pre-migration GRMetro installation.
- A migration Setup built with an explicit test/staging CalVer, release-source policy, and test/staging public verification key.
- Two later signed portable releases so two routine updates can be tested without rerunning Setup.
- Plain-text release notes for both releases.
- A copy of this checklist and a place to record screenshots, versions, timestamps, and errors.

Do not use production signing keys or production credentials. Confirm the migration candidate is clearly labeled unsigned unless an approved Authenticode certificate was supplied.

## Baseline capture

1. Record the installed GRMetro version and backend health response.
2. Record whether `.grmetro-autostart-choice` is `yes` or `no` without copying any other `.env` or private content.
3. Record Desktop and Start Menu shortcut target, arguments, and working directory.
4. Export only the GRMetro scheduled-task definition if it exists.
5. Record file hashes for nonprivate sentinels and only presence/size for protected data paths.
6. Confirm the ServiceTitan Edge and Remote App profiles exist; do not inspect their contents.
7. Confirm TV URLs and phone remote work before migration.

## Migration Setup

1. Run the migration Setup interactively.
2. Confirm configuration, firewall choice, autostart choice, `.env`, goals, display settings, dismissals, spreadsheet data, logs, and both browser profiles remain present.
3. Confirm `%LOCALAPPDATA%\GRMetro\Update Host\GRMetro Update Host.exe` exists outside the application tree.
4. Confirm `%LOCALAPPDATA%\GRMetro\Update State\release-source.json` contains the intended staging source and no credential.
5. Confirm the host public-key file contains only the intended staging public key and verify its documented SHA-256 fingerprint.
6. Confirm Desktop and Start Menu shortcuts target the exact Update Host EXE with `-Mode Launch` and use the Update Host directory as working directory.
7. If autostart was enabled, confirm the single GRMetro task executes the exact Update Host EXE with `-Mode Launch`. If disabled, confirm no GRMetro autostart task exists.
8. Launch through each shortcut and confirm recovery runs before the native Control Center opens.
9. Reboot once and confirm the preserved autostart choice behaves exactly as before.

## Recovery-before-launch matrix

Use disposable copies or the repository's fixture tooling to create each state. Never hand-edit the real production transaction.

1. `prepared`: launch through Update Host; confirm transaction cleanup and old application launch.
2. `applying`: launch through Update Host; confirm backup preflight, rollback, cleanup, and old application launch.
3. `applied`: launch through Update Host; confirm rollback and old application launch.
4. `completed`: launch through Update Host; confirm cleanup and new application launch.
5. Corrupt/invalid journal: confirm Update Host refuses application launch, preserves evidence, and displays a useful error.
6. Confirm none of these recovery checks launches or terminates Edge before the application itself starts.

## First routine signed update

1. Open the Control Center through the Update Host shortcut.
2. Confirm installed version is correct.
3. Select Check for Updates and confirm the later signed release appears.
4. Open View Changes and confirm notes display as plain text.
5. Select Update Now and confirm no installation begins without approval.
6. During download, confirm percentage advances and the existing backend/dashboard remains usable.
7. Confirm signature, size, digest, manifest, and rollback-backup phases complete before the Control Center exits.
8. Confirm the external Update Host then shows stopping, installing, validating, and completing states.
9. Confirm the new Control Center opens and reports the new version and healthy backend.
10. Confirm ServiceTitan is connected, reconnecting, or requests login without affecting update success.
11. Confirm TVs and phone remote reconnect and preserve their permanent URLs and existing behavior.
12. Confirm all protected data and both Edge profiles remain intact.
13. Reboot and confirm recovery-first launch still works.

## Interrupted and failed update tests

1. In a disposable test, interrupt power/process after journal state becomes `applying`; reboot and confirm rollback before launch.
2. Repeat after `applied`; confirm rollback before launch.
3. Force application validation failure; confirm the previous release is restored and reopened.
4. Confirm failure leaves no changed persistent/private data.
5. If recovery refuses or rollback fails, stop. Preserve the transaction directory and exact error. Do not rerun or delete evidence.

## Second routine signed update

1. Publish the second staging release to the same static test origin.
2. Check from the Control Center.
3. Install through Update Now.
4. Confirm version advances again without rerunning Setup.
5. Repeat backend, ServiceTitan, TV, phone remote, persistent-data, profile, and reboot checks.

## Acceptance

The migration candidate passes only when every item succeeds, no private material appears in artifacts or diagnostics, no duplicate shortcuts/tasks exist, corrupt recovery evidence blocks launch, and two consecutive routine updates complete without Setup.
