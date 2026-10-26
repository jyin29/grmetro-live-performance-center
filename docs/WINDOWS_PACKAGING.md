# Windows packaging / local application workflow

The first packaging stage turns the repository into a single-machine Windows application experience without changing the ServiceTitan browser integration.

## What it does

- Reuses an established dedicated ServiceTitan Edge profile and defaults new installations to `%LOCALAPPDATA%\GRMetro\Edge Profile`.
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

`npm run build:windows-exe` generates the launcher and icon. `npm run package:windows` builds in an isolated temporary tree and generates the ZIP and self-extracting Setup EXE under `dist/windows-installer`. These build commands do not install the application, register autostart, start Edge, or restart the existing backend.

For a reviewed application-only manual deployment, `build-installer.ps1 -PackageOnly -OutputDirectory <path>` runs the same isolated dependency, dashboard, bundled-runtime, identity, and manifest pipeline but stops after producing the portable ZIP. It does not build Setup, the external Update Host, trust provisioning, shortcuts, tasks, firewall integration, or installer bootstrap files. Nondevelopment package identity records the full committed Git SHA; a dirty source remains marked `working-tree` and is rejected by the manual legacy wrapper.

### Host-only migration for an existing application-only installation

Application-only ZIPs deliberately cannot write `%LOCALAPPDATA%\GRMetro\Update Host` or updater trust state. An installation created and maintained only through those ZIPs therefore shows “The stable GRMetro Update Host is not installed” even though local transactional updates work. Use the dedicated host-only migration rather than reinstalling the application.

`build-update-host-migration.ps1` requires a clean committed source tree, an enabled HTTPS release-source policy, and a fingerprinted public-key document whose channel authorization matches that source. It builds the external host, applies optional Authenticode signing, embeds only the public trust material, and emits an immutable bundle plus `migration-build.json`. It never includes a release private key or application/private runtime state.

`install-update-host.ps1` validates the approved bundle SHA-256, installed release/channel, pending transaction state, bundle inventory, pinned-key fingerprints, Authenticode state, and a live signed-feed discovery before committing the migration. Feed discovery is read-only and does not advance replay state. It transactionally installs only the external host and source policy, then migrates Desktop and Start Menu shortcuts to recovery-first `Update Host -Mode Launch` while preserving the exact autostart choice. It does not replace application files, stop GRMetro, contact ServiceTitan, or inspect/change either Edge profile. Any failure restores the prior host, source policy, shortcuts, and scheduled-task state.

An unsigned internal host requires the explicit `-ConfirmUnsignedInternalHost` switch after Defender scanning and authorized security review. This confirmation does not bypass Defender or signature verification for release metadata. A `testing` source/key can authorize only `testing` metadata; stable release discovery still requires a separately provisioned stable-channel public key and feed.

The generated Setup EXE contains a pinned official Windows x64 Node runtime, lockfile-resolved production dependencies, and the compiled Vite dashboard. Node.js, npm, Git, the repository, development dependencies, and a compiler are build-computer concerns only. They are not target-computer prerequisites. The pinned Node archive is accepted only when its SHA-256 checksum matches `runtime-versions.json`.

## Package contents

[The package manifest](../scripts/windows/package-manifest.json) is the reviewed source-file allowlist. The packager copies only these working-tree files into an isolated tree, installs dependencies there with `npm ci`, builds the dashboard there, replaces that dependency tree with `npm ci --omit=dev`, adds the pinned Node runtime, and writes a version-2 manifest containing every final payload file. No repository `node_modules`, existing frontend build, recursive checkout copy, or automatic Git discovery is used.

After the isolated build succeeds, the packager removes dashboard source, application tests, Vite configuration, syntax-check tooling, and the placeholder remote workspace from the disposable stage. The final target payload retains the backend/shared runtime source required by Node, the compiled dashboard, production dependencies, native Windows scripts, and reviewed operating documentation.

Excluded content includes real environment files, both runtime data directories, local/private configuration, browser profiles, cookies/session material, logs, development dependency trees, existing repository build output, research output, and temporary files such as `~.DDF`. Only the blank deployment template `.env.example` is included. The compiled frontend and production dependencies come exclusively from the isolated package build.

After building, the portability validator installs the ZIP into a disposable path containing spaces, removes global Node/npm locations from `PATH`, loads all required production modules with the bundled runtime, starts the backend from the extracted package, checks health, and verifies the built remote page is served. It also rejects developer-specific repository paths, development-only dependencies, private data, logs, and browser authentication/session files.

## Destination prerequisites

- Windows 10 or Windows 11 with built-in Windows PowerShell 5.1 and the Windows .NET Framework/WPF components.
- Microsoft Edge. Setup detects it before completing. GRMetro uses the full Edge browser through CDP and also hosts the native-launched Phone Remote in Edge app mode. WebView2 is not used or required.
- Network access to ServiceTitan and a trusted private LAN for phones and TV displays.
- Administrator approval only when the user keeps the default private-network firewall option enabled. Setup creates a narrowly scoped inbound TCP rule for the bundled Node executable on port 3000. Declining the UAC request leaves the application installed but LAN clients may be blocked.

The shared ServiceTitan profile resolver honors an explicit `-ProfilePath` first. Without an override, it preserves an established legacy `C:\edge-dashboard-profile`, otherwise reuses an established `%LOCALAPPDATA%\GRMetro\Edge Profile`, and defaults a fresh installation to the LocalAppData path. If both locations contain profile data, startup, restart, and operator shutdown stop with an explicit ambiguity error instead of selecting or migrating either profile. The resolver never copies, resets, deletes, or edits profile contents. The selected profile is never embedded in Setup and is not part of application upgrade transactions. The operator signs into ServiceTitan manually and completes MFA in that window.

`SERVICETITAN_TECHNICIANS_JSON` canonically stores an ordered JSON array. Windows PowerShell 5.1 versions of the configuration wizard historically serialized that array as an equivalent two-property wrapper, `{"value":[...],"Count":N}`. The shared loader accepts only the canonical array or that exact wrapper with a matching count, then runs both through the same technician validation without changing order or identities. The wizard displays and saves canonical array JSON. Arbitrary objects, extra wrapper fields, count mismatches, empty arrays, malformed records, and duplicate IDs fail with bounded messages that contain no configuration values.

Before a manual legacy upgrade prepares a transaction, the target package's own technician parser is extracted to a disposable temporary directory and run with the installed bundled Node and dotenv module against the existing `.env`. The preflight emits only compatibility status and technician count, never writes `.env`, never contacts ServiceTitan, and deletes its temporary files. This makes `-ValidateOnly` detect private-configuration incompatibility before backup, process shutdown, or application-file replacement.

The standalone Phone Remote window uses a separate `%LOCALAPPDATA%\GRMetro\Remote App Profile`; it never shares,
clears, packages, or modifies the dedicated ServiceTitan authentication profile. Its embedded page remains the same
locally served `/remote` production build, and its QR action encodes the LAN URL rather than the loopback app URL.

## Reinstall and upgrade preservation

### Audited legacy manual upgrade

`manual-legacy-upgrade.ps1` is a narrow compatibility entry point for an audited installation that already has a complete schema-2 package manifest but still carries pre-release `package-build.json` identity. It requires the expected installed Git commit, target CalVer, and portable ZIP SHA-256 as explicit inputs. Its read-only preflight validates the exact per-user installation root, rejects reparse points and pending transactions, verifies every historical manifest file is present, recognizes the legacy identity without manufacturing CalVer fields, validates the target release identity and complete archive, and makes no installed-file changes.

An apply requires explicit confirmations for Defender review and a separately verified post-success restoration source. The shared transaction engine then stages the new package and verifies the complete rollback backup before shared process control stops only GRMetro-owned processes. It replaces only manifest-listed application files, validates the installed runtime/backend/dashboard, commits transaction cleanup, and then starts the Control Center. Any failure before commit invokes the existing checksum-verified rollback, restores the prior running state when safe, and writes a bounded nonsecret diagnostic record beside the installation. It does not run Setup integration and therefore does not rewrite `.env`, data, logs, browser profiles, shortcuts, firewall rules, autostart preference, scheduled-task registration, Update Host trust, or replay state. Installations with modern release identity continue to use the normal Update Host and are rejected by this compatibility entry point.

### Shared application transaction and Update Host foundation

Setup and the external Update Host use the same functions in `package-files.ps1`. The engine exposes preparation and application separately: preparation validates and extracts the complete package, reads the historical installed inventory, creates and verifies the full rollback backup, and publishes a version-2 `prepared` journal without changing installed application files. After the initiating Control Center exits, shared process control stops only packaged GRMetro processes; application then advances the journal through `applying` and `applied`. Side-effect-free validation checks the bundled runtime, production modules, Control Center self-test, production-mode backend health/version, and compiled dashboard without running the configuration wizard or changing `.env`, firewall, autostart, or shortcuts. Its validation child uses an intentionally unavailable loopback CDP endpoint, proving backend health without attaching to or requiring the operator's ServiceTitan session. Commit records `completed` and performs bounded cleanup.

Setup builds and carries a small native Update Host bundle for `%LOCALAPPDATA%\GRMetro\Update Host`. The host has its own copies of the transaction, process-control, validation, and release-identity modules and therefore does not execute code from the application tree while replacing it. Phase 1 supports only disposable/local package handoff for automated validation; remote release discovery, download, authentication, and signed release metadata are deliberately deferred.

On host startup, an absent journal with abandoned staging or a version-2 `prepared` journal is safely retired because installed files were not mutated. `applying` and `applied` journals preflight and restore the previous application. A `completed` journal finishes cleanup while retaining the committed release. Invalid or corrupt evidence stops launch and remains available for diagnosis. Existing strict legacy recovery proof remains unchanged.

Portable builds generate schema-2 `package-build.json` metadata containing `releaseVersion`, numeric `releaseSequence`, `channel`, `commit`, `sourceState`, `builtAt`, `updaterProtocol`, and bundled Node version. Explicit production releases use `YYYY.M.D.N`; ordinary developer packaging uses `0.0.0.0` on the `development` channel. npm workspace versions remain valid SemVer and are not the installed deployment identity.

### Signed release feed and routine update UX

Phase 2 adds a provider-independent release client to the external Update Host. The client reads updater-owned `release-source.json`, downloads bounded raw `release.json` and `release.json.sig` responses, uses the untrusted `keyId` only to select a fixed pinned public key, verifies an RSA PKCS#1 v1.5 SHA-256 signature over the exact metadata bytes, and only then parses trusted release fields. Production URLs require HTTPS, contain no embedded credentials, and must remain on the configured host allowlist across every bounded redirect. The checked-in source template is disabled and contains no release credential; a real source and public key must be provisioned before deployment.

Trusted metadata supplies CalVer identity, numeric sequence, channel, artifact URL, exact byte length, SHA-256, minimum updater protocol, publication time, plain-text notes, and key ID. The client rejects malformed dates and versions, development identity, wrong channels, incompatible protocol, downgrade/same-version installation, replay below the highest trusted sequence, and reuse of a trusted identity with a different artifact digest. Trust state is written atomically under `%LOCALAPPDATA%\GRMetro\Update State` and survives application and Update Host upgrades.

Artifacts download to locally generated names under the updater cache using `.partial` until their exact signed size and digest pass. Failed or abandoned partials are removed without using server-provided filenames. The signed ZIP is then revalidated by the shared package allowlist and manifest parser, its digest is rechecked immediately before preparation, and its packaged deployment identity must equal the signed release identity. No installed application file changes before the verified package has completed Phase 1 preparation.

The native Control Center checks asynchronously after launch and every six hours after success. Network failures use bounded five-minute, thirty-minute, and six-hour backoff, remain nonmodal for automatic checks, and leave the dashboard/backend untouched. Manual checks may show an actionable error. The Updates card displays installed and available versions, a signed plain-text summary, View Changes, Check for Updates, and Update Now. It never installs or downloads automatically. Download, hashing, signature verification, manifest validation, staging, and backup run in the external process while WPF polls an updater-owned status file. Once preparation reports ready, the Control Center exits and the Update Host owns quiescence, application, validation, rollback, and relaunch.

`npm run release:windows -- -Version <YYYY.M.D.N> -Channel stable -ArtifactUrl <https-url> -SigningKeyPath <external-key> -KeyId <id> -ReleaseNotesPath <file>` creates local upload-ready output only. Production creation requires a clean committed source tree, explicit nondevelopment CalVer, an external RSA key of at least 3072 bits, nonreused local release identity, and HTTPS artifact URL. It builds the portable package, writes exact metadata bytes, creates the detached signature, self-verifies it, and emits only the public provisioning key. It never uploads or publishes.

### Migration Setup and recovery-first launch

Migration Setup snapshots the exact existing Desktop and Start Menu shortcut bytes plus the existing GRMetro scheduled-task XML before changing launch integration. It installs the stable Update Host, then points both shortcuts and the single autostart task to the exact external host with `-Mode Launch`. The saved `.grmetro-autostart-choice` decides whether that task exists; migration does not change the choice. If Setup fails, shortcut bytes and task XML are restored before the prior application runtime is restarted. A power interruption after launch migration remains safe because the new shortcut enters the host, which recovers the pending application transaction before launch.

The application-root command launcher and Control Center shortcut action also prefer the Update Host after migration. Recovery itself never launches or terminates Edge. Only after recovery succeeds does the host start the installed native launcher, whose established startup behavior may start the backend and dedicated ServiceTitan browser.

Routine application packages cannot replace `%LOCALAPPDATA%\GRMetro\Update Host`, pinned keys, source policy, cache, or replay state. Update Host, trust-root, and updater-protocol changes require full Setup. A routine release whose `minimumUpdaterProtocol` is newer remains blocked with the native “newer GRMetro Setup” message.

### Trust provisioning and Authenticode

Checked-in feed defaults remain disabled and the checked-in key set remains empty. `release-source.production.template.json` contains required placeholders rather than an invented production host. A migration build changes trust only when supplied explicit validated source/key files together with `-ProvisionReleaseTrust`. That Setup may replace source policy and pinned keys while retaining replay/cache state; an unprovisioned repair Setup preserves existing source policy and public keys.

`provision-release-signing-key.ps1` provides intentional external RSA-3072/4096 generation, public export, SHA-256 public fingerprint display, and pair verification. Generation requires an explicit confirmation switch, refuses repository paths and overwrite, and is never invoked by normal builds. The private release key stays off production PCs.

`build-installer.ps1` and `create-windows-release.ps1` accept external SignTool path, certificate thumbprint, RFC 3161 HTTPS timestamp URL, and `-RequireAuthenticode`. Production signing covers the GRMetro native launcher, Update Host, and Setup EXE and verifies signer status/thumbprint after signing. Without these inputs, development output remains unsigned; local release output includes `NOT-PRODUCTION-READY-UNSIGNED.txt`.

The full second-PC procedure is in `docs/WINDOWS_UPDATER_MIGRATION_TEST.md`; controlled release/key workflow is in `docs/WINDOWS_RELEASE_WORKFLOW.md`.

### Cloudflare staging origin and public-package privacy

The confirmed staging source is `https://grmetro-updates.grmetroheatingandcooling.workers.dev`, backed by the private `grmetro-updates` R2 bucket through the `UPDATES_BUCKET` Worker binding. `scripts/windows/release-source.cloudflare-staging.json` enables the `testing` channel for that exact host and the isolated `/staging/release.json` and `/staging/release.json.sig` paths. Production retains the root metadata paths for a future stable channel and separate production key. Checked-in defaults remain disabled and contain no key. Worker compatibility and no-store metadata behavior are documented in `docs/CLOUDFLARE_RELEASE_HOSTING.md`.

Cloudflare ZIP objects use the immutable lower-case name `grmetro-performance-center-YYYY.M.D.N.zip`. Release tooling emits that exact name. Publish the unique ZIP first, signature second, and metadata last; never overwrite a versioned ZIP key.

Because the ZIP is publicly downloadable, packaging replaces source-tree technician and goal fallbacks with generic deployment placeholders before building, while the backend preloads the destination machine's preserved private `.env` before importing shared configuration. The public artifact excludes real employee names and ServiceTitan technician IDs, internal repository instructions/specifications, README, reference screenshots, tests, runtime data, browser profiles, logs, credentials, and signing keys.

The public ZIP necessarily still exposes executable application material: backend JavaScript source, shared KPI/ranking/presentation logic with generic display configuration, compiled/minified frontend assets, Windows operational scripts, dependency names and versions, production dependencies, the bundled Node runtime, branding assets, blank `.env.example`, package inventory, and the native launcher. These implementation details contain no authentication material but are not confidential once uploaded.

The installer validates the entire ZIP against its manifest and permitted application paths before replacing any installed file. Unexpected, duplicate, missing, traversal, and private-data entries are rejected; destination junctions/symlinks are not followed. It extracts a complete application tree to a sibling transaction directory, backs up the union of the old and new manifest file sets, verifies every backup checksum, and atomically publishes a recovery journal before changing the installation. Installed manifests are treated as historical file inventories: their paths are validated, but a newer release's required-file policy is never imposed retroactively. This permits legitimate additions such as `.env.example` without pretending the file existed in the prior installation.

Normal failures immediately restore every replaced or removed application file. Version-2 transaction journals distinguish `prepared` (verified backups, no installed mutation), `applying`, `applied`, and `completed`. A prepared transaction can be abandoned without touching the application; applying/applied recovery preflights every backup before restoring any file, preventing a corrupt backup set from causing a partial rollback. If the installer process or machine stops after mutation begins, the journal and backup remain beside the installation; the next installer run restores that prior application before attempting the new upgrade. A completed journal means the new application was fully applied and only transaction cleanup remained. The transaction contains application files only and never copies persistent data or ServiceTitan browser/session material.

Legacy version-1 journals used `prepared` for the entire operation. Recovery therefore compares every installed
application file with the retained stage and backup inventories. A complete stage match is treated as a fully applied
stale transaction; a complete backup match is treated as already rolled back. Partial state enters checksum/preflighted
rollback. Missing or contradictory evidence stops with the transaction directory intact instead of guessing or
overwriting evidence.

Version-1 rollback called recursive transaction cleanup only after every restore copy completed. A historical
`prepared` transaction with no stage and a partially deleted backup can therefore be retired as interrupted
post-rollback cleanup only when all of the following hold: every journal record says the file previously existed; the
installed manifest and journal inventories match exactly; every installed packaged file exists; every surviving backup
hash matches its installed counterpart; every surviving backup belongs to the journal; at least one backup survives and
at least one is missing; and installed `.env.example` matches the independently known historical template fingerprint.
Any missing installed file, inventory difference, unreadable file, surviving-backup mismatch, unexpected backup path,
or genuinely partial stage/install comparison refuses recovery and preserves the evidence. This proof is evaluated
before GRMetro processes are stopped, so an ambiguous stale transaction does not unnecessarily interrupt production.

After a transaction is proven safe to retire, cleanup validates the exact sibling transaction path and attempts
recursive removal up to twelve times with 250 ms delays. Every attempt is followed by an existence check. A deletion
exception is treated as success only when the root is already absent; retries are limited to Windows
`ERROR_DIR_NOT_EMPTY`/equivalent `IOException` races. Access denial, reparse-point detection, unsafe paths, and other
errors fail immediately. Retry exhaustion preserves the remaining evidence and reports its exact validated path.

Before recovery or replacement, Setup stops the GRMetro scheduled-task instance and only processes executing from the
installed application: its supervisor/launcher PowerShell processes, bundled backend Node runtime, and native launcher.
It does not stop Microsoft Edge or modify either GRMetro Edge profile. This releases packaged executables such as
`runtime/node/node.exe` before `Copy-Item` replacement. After success the new control center starts normally; after a
fully successful rollback, the previously running GRMetro operator/runtime is restarted.

Setup keeps the application transaction in its prepared/recoverable state while the installed configuration wizard and runtime validation execute. The wizard is launched explicitly in STA mode from the installed application root. Its stdout, stderr, script path, working directory, and exit code are captured for the native error dialog. A pre-window WPF failure or missing/quarantined wizard therefore reports its actual diagnostic and rolls a clean first install back instead of leaving a partial application. Upgrades restore the previous application version on the same failure. Transaction cleanup occurs only after configuration, runtime validation, shortcuts, and optional setup actions complete.

Obsolete cleanup is also manifest-driven. A file is removed only when the installed package manifest listed it and the incoming package manifest does not. The installer then removes only empty application directories associated with those obsolete paths. An unlisted local file is not treated as obsolete, and no application or data directory is broadly cleared.

The actual storage implementations require preservation of:

- `data/goals.json`, `data/display-settings.json`, and `data/management-dismissals.json`, resolved relative to the backend working directory by the goal, display-preference, and management-notification stores.
- The same files under `apps/backend/data` when launched through the backend npm workspace.
- `apps/backend/data/spreadsheet-slide.json`, resolved relative to the spreadsheet store module.

Both entire data directories remain untouched, including temporary save files and the existing local `data/company-config.json` (which is not referenced by the current backend). `.env`, other environment files, private configuration, `.grmetro-autostart-choice`, logs, and other non-package files also remain in place. The external dedicated Edge profile is neither packaged nor removed. No secret-bearing environment backup is copied to a temporary directory.

Runtime data is never a transaction target. Application upgrades should still be performed during a planned maintenance window: files held open by a running process can make the upgrade fail and roll back, and the packager does not stop existing processes. Installations created before package manifests existed have no explicit obsolete-file inventory, so their unknown unlisted files are retained during the first manifest-based upgrade. Later upgrades clean obsolete application files from the installed manifest normally.

## Safe validation

`npm test` includes Windows-only PowerShell integration checks. They use disposable fixtures under a path containing spaces, verify exact package contents, successful upgrades, added-file transitions, obsolete cleanup, forced-failure rollback, interrupted/stale-upgrade recovery, locked-file retry behavior, large dependency inventories, dual failure diagnostics, targeted process release, and persistent-data preservation. The version-transition fixture specifically upgrades a prior portable manifest without `.env.example` to one that includes it, then forces a later failure and verifies the exact prior file set returns. The tests also reject unsafe archives before writes, construct WPF windows without showing them, parse every Windows script, and run harmless child scripts through the real v2 launch functions. They do not execute setup, installer entry points, autostart, real supervisor, or Edge actions.
