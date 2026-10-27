# Windows packaging / local application workflow

The first packaging stage turns the repository into a single-machine Windows application experience without changing the ServiceTitan browser integration.

## What it does

- Uses the dedicated Microsoft Edge profile at `C:\edge-dashboard-profile`.
- Starts Edge with CDP remote debugging on port `9223`.
- Builds the Vite dashboard and lets the backend serve the compiled dashboard at `http://127.0.0.1:3000`.
- Starts the Node backend in production mode.
- Waits for the backend health endpoint before opening the dashboard.
- Keeps private company configuration in the ignored root `.env` file.

## First setup

1. Run `scripts\windows\Setup Live Performance Center.cmd`.
2. Open `.env` and fill in at least:
   - `SERVICETITAN_BUSINESS_UNIT_IDS`
   - `SERVICETITAN_TECHNICIANS_JSON`
3. Keep `EDGE_DEBUG_URL=http://127.0.0.1:9223`.
4. Sign into ServiceTitan in the dedicated Edge window and navigate to the Modular Dashboard / technician scorecard page used by the integration.

## Normal startup

Double-click `scripts\windows\Start Live Performance Center.cmd`.

The launcher starts/reuses the dedicated Edge session, starts the application, waits until it is healthy, then opens the dashboard.

## Native launcher and installer

The root command launcher, generated launcher EXE, and `npm run launch:windows` use the crash-reporting host and native v2 control center. Worker script paths are quoted for installations such as `%LOCALAPPDATA%\GRMetro\Performance Center`. The setup wizard declares both WPF XML namespaces.

`npm run build:windows-exe` generates the launcher and icon. `npm run package:windows` also generates the ZIP and self-extracting Setup EXE under `dist/windows-installer`. These build commands do not install the application, register autostart, start Edge, or restart the backend. Node.js 22+ and npm 10+ remain installation prerequisites; setup installs dependencies and builds/tests the application.

## Package contents

[The package manifest](../scripts/windows/package-manifest.json) is an exact, reviewed file list. The packager copies only these working-tree files, including the generated launcher/icon. New application files must be added explicitly. Source and test files are intentional: installed setup still runs the build and test suites. No recursive checkout copy or automatic discovery of untracked files is used.

Excluded content includes real environment files, both runtime data directories, local/private configuration, browser profiles, cookies/session material, logs, dependency trees, existing frontend builds, research output, and temporary files such as `~.DDF`. Only the blank deployment template `.env.example` is included. Build outputs are regenerated on the target machine rather than distributing a potentially machine-specific frontend build.

## Reinstall and upgrade preservation

The installer validates the entire ZIP against its manifest and permitted application paths before replacing any installed file. Unexpected, duplicate, missing, traversal, and private-data entries are rejected; destination junctions/symlinks are not followed. It extracts a complete application tree to a sibling transaction directory, backs up the union of the old and new manifest file sets, and atomically publishes a recovery journal before changing the installation.

Normal failures immediately restore every replaced or removed application file. If the installer process or machine stops after mutation begins, the journal and backup remain beside the installation; the next installer run restores that prior application before attempting the new upgrade. A completed journal means the new application was fully applied and only transaction cleanup remained. The transaction contains application files only and never copies persistent data or ServiceTitan browser/session material.

Obsolete cleanup is also manifest-driven. A file is removed only when the installed package manifest listed it and the incoming package manifest does not. The installer then removes only empty application directories associated with those obsolete paths. An unlisted local file is not treated as obsolete, and no application or data directory is broadly cleared.

The actual storage implementations require preservation of:

- `data/goals.json` and `data/display-settings.json`, resolved relative to the backend working directory by `GoalStore` and `DisplaySettingsStore`.
- The same files under `apps/backend/data` when launched through the backend npm workspace.
- `apps/backend/data/spreadsheet-slide.json`, resolved relative to the spreadsheet store module.

Both entire data directories remain untouched, including temporary save files and the existing local `data/company-config.json` (which is not referenced by the current backend). `.env`, other environment files, private configuration, `.grmetro-autostart-choice`, logs, and other non-package files also remain in place. The external dedicated Edge profile is neither packaged nor removed. No secret-bearing environment backup is copied to a temporary directory.

Runtime data is never a transaction target. Application upgrades should still be performed during a planned maintenance window: files held open by a running process can make the upgrade fail and roll back, and the packager does not stop existing processes. Installations created before package manifests existed have no explicit obsolete-file inventory, so their unknown unlisted files are retained during the first manifest-based upgrade. Later upgrades clean obsolete application files from the installed manifest normally.

## Safe validation

`npm test` includes Windows-only PowerShell integration checks. They use disposable fixtures under a path containing spaces, verify exact package contents, successful upgrades, obsolete cleanup, forced-failure rollback, interrupted-upgrade recovery, retry behavior, and persistent-data preservation. They also reject unsafe archives before writes, construct WPF windows without showing them, parse every Windows script, and run harmless child scripts through the real v2 launch functions. They do not execute setup, installer entry points, autostart, real supervisor, or Edge actions.
