# GRMetro Windows release workflow

Publication remains a separate, explicitly authorized action. The release command prepares verified local output but never uploads it.

## Two-click internal staging release

The development PC exposes `Publish GRMetro Update.cmd` at the repository root. After reviewed application work is committed and the tree is clean:

1. Double-click `Publish GRMetro Update.cmd`.
2. Review the displayed commit, automatically selected CalVer, testing channel, and release note, then type `PUBLISH` once.

The launcher does not install anything on production. It performs the complete development-side workflow:

- proves the Git tree is clean, committed, on a branch, and attached to `jyin29/grmetro-live-performance-center`;
- verifies the external RSA-3072 staging key against its public fingerprint without copying private material into the repository or output;
- verifies the internal Authenticode policy, non-exportable signing certificate, pinned public root, certificate lifetime, and timestamp policy;
- verifies Cloudflare OAuth account `8d710ff406719195e28bff0bb5971269`, R2 bucket `grmetro-updates`, HTTPS source policy, existing signed feed, and target-key state;
- chooses the next `YYYY.M.D.N` testing release and refuses a future-dated feed or daily revision overflow;
- runs every repository and workspace test while serializing root test files to keep Vite, esbuild, PowerShell, and Windows packaging fixtures within development-PC memory limits; performs an isolated application-only Windows build with a bounded Node heap; signs the launcher; creates exact-byte RSA metadata; validates manifest/private-data exclusions; and scans the ZIP plus a disposable extraction with Defender;
- uploads the immutable versioned ZIP first, `release.json.sig` second, and `release.json` last;
- compares direct R2 and public Worker bytes after each write, then verifies the live signed feed advertises the new version;
- saves prior metadata/signature beneath `%USERPROFILE%\GRMetro-Cloudflare-Publication-Backups` and restores that pair once if mutable publication fails.

An identical versioned ZIP left by an interrupted run is reused only when its byte size and SHA-256 match. A conflicting immutable object stops publication. Multiple unpublished local candidates also stop with an actionable error. The workflow never deletes versioned ZIPs, changes production source/trust configuration, or invokes `ApplyLocal`, `PrepareRemote`, or any installer.

Cloudflare commands and public HTTPS reads use at most four attempts with 1, 2, and 4 second exponential delays, and only for classified transient transport, timeout, throttling, or server errors. Authentication, policy, signature, hash, size, content-type, cache, and other integrity failures are never retried. If an immutable ZIP upload disconnects after Cloudflare may have accepted it, the publisher reads the exact R2 key and resumes only when both SHA-256 and byte size match; conflicting bytes are never overwritten. Detached signature and metadata remain mutable rollback-controlled objects, with metadata still written last.

A locally complete candidate may resume after a publisher-only reliability fix when its signed source commit is an ancestor of the current publisher commit and every intervening path is restricted to the publisher script, its focused tests, or release-workflow documentation. Any application-affecting change blocks resume and requires a new immutable release identity.

After publication, production remains operator-controlled. Open Control Center, review the current and available versions and signed release note, then click `Update Now`. The external Update Host reports download, verification, backup, installation, validation, completion, and rollback status. `Recovery Logs` remains the one-click diagnostic entry point. Never retry a failed installation until its displayed rollback result and recovery evidence have been reviewed.

## Import reviewed application commits safely

Keep active dashboard development in its existing worktree, even when that worktree also contains unrelated or uncommitted experiments. Commit only the reviewed application files with explicit Git paths, copy the resulting full 40-character commit SHA, then:

1. Open `Import Reviewed GRMetro Commit.cmd` in the clean `grmetro-release-publisher` worktree.
2. Paste the one full commit SHA.
3. Review the displayed subject and complete file list, then type `IMPORT`.
4. Repeat once per dependent reviewed commit, in dependency order.
5. Run or review the focused application tests, then use `Publish GRMetro Update.cmd` only while the release worktree is clean.

The importer accepts exactly one ordinary commit at a time. It rejects ranges, branches, tags, abbreviated SHAs, merge commits, already-imported commits, private/runtime/generated paths, and release-infrastructure changes. It uses `git cherry-pick` only inside the release worktree. A conflict triggers one automatic `cherry-pick --abort` and verifies the original clean HEAD; it never resets, cleans, stages broadly, or touches the source development worktree. Uncommitted source files therefore cannot enter a release.
## One-time provisioning

1. Choose the real static HTTPS release origin and exact host name.
2. Copy `scripts/windows/release-source.production.template.json` outside the repository and replace every required placeholder.
3. Intentionally generate an RSA-3072 or RSA-4096 release key outside the repository:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/windows/provision-release-signing-key.ps1 `
     -Action Generate `
     -KeyId grmetro-release-YYYY `
     -PrivateKeyPath X:\secure\grmetro-release-private.xml `
     -PublicKeyPath X:\secure\grmetro-release-public.json `
     -KeySize 3072 `
     -ChannelScope stable `
     -ConfirmProductionKeyGeneration
   ```

4. Back up the private key in approved secure storage. Keep it off production PCs and outside the repository.
5. Independently record the public SHA-256 fingerprint printed by the tool.
6. Verify the pair with `-Action VerifyPair` before building a migration Setup.
7. When an approved Authenticode certificate exists, install/access it through the approved Windows certificate store or hardware provider and record its certificate thumbprint and RFC 3161 HTTPS timestamp URL.

## Migration Setup build

Build with explicit release-source and public-key inputs plus `-ProvisionReleaseTrust`. Setup validates them before embedding. Defaults remain disabled/empty when those parameters are absent. A provisioning migration may replace release-source policy and pinned public keys; ordinary application ZIPs cannot. Existing replay/cache state remains outside replacement.

When Authenticode is available, also provide SignTool, certificate thumbprint, timestamp URL, and `-RequireAuthenticode`. The build signs and verifies:

- `GRMetro Performance Center.exe`
- `GRMetro Update Host.exe`
- `GRMetro Performance Center Setup.exe`

The official bundled Node runtime retains its vendor signature and is not re-signed as GRMetro code.

For controlled Cloudflare staging, use `scripts/windows/release-source.cloudflare-staging.json` and a separately generated external staging key with a staging-specific key ID. Do not reuse that key as the production release key. Cloudflare publication details and the required metadata-404 cache header are documented in `docs/CLOUDFLARE_RELEASE_HOSTING.md`.

`testOnly` marks disposable automated-test keys and causes normal installed hosts to reject them. Persistent staging and production trust roots use `testOnly: false` because they are intentionally installed, then use mandatory `allowedChannels` for separation: the staging key allows only `testing`; a future production key allows only `stable`. Signature verification fails when metadata channel is outside the selected key's scope, even if the RSA signature itself is valid.

## Routine release

1. Finish and review feature work.
2. Run all tests, build, packaging validation, privacy scan, and credential scan.
3. Commit the complete source release.
4. Choose the next immutable CalVer `YYYY.M.D.N`.
5. Write bounded plain-text release notes.
6. Run the local release command with the external release private key and final HTTPS artifact URL.
7. For production publication, require Authenticode parameters and `-RequireAuthenticode`.
8. Verify local output, release metadata signature, SHA-256, package identity, Authenticode status, and public-key fingerprint.
9. Upload only:
   - `grmetro-performance-center-YYYY.M.D.N.zip`;
   - `release.json`;
   - `release.json.sig`.
10. Confirm the static origin serves exact bytes over HTTPS.
11. Check for updates from a staging Control Center before authorizing production use.
12. Production operator opens the Control Center, reviews changes, and selects Update Now.

Unsigned output contains `NOT-PRODUCTION-READY-UNSIGNED.txt` and must not be published or deployed as a production release.

## Key rotation and protocol changes

Pinned-key or Update Host protocol changes require a new migration Setup. Provision both old and new public keys during an overlap release when practical, publish releases under the new `keyId`, then remove the retired key through a later migration Setup. Routine application ZIPs never replace the Update Host or its public-key set.
