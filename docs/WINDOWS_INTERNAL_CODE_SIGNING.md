# GRMetro internal Authenticode signing

`Publish GRMetro Update.cmd` consumes this pinned policy automatically. Its preflight requires the approved certificate with private key in the development certificate store, verifies the external public root, and refuses publication when the certificate is missing, ambiguous, expired, near expiry, or outside policy. Only public certificate metadata and the signed executable enter release output; the private key remains non-exportable in Windows certificate storage.

GRMetro uses two independent signatures:

- RSA-SHA256 signs `release.json` for Update Host feed authorization, channel scoping, and replay protection.
- Authenticode signs Windows executable and PowerShell artifacts so a managed Windows host can verify their internal publisher and file integrity.

Neither signature disables Microsoft Defender or creates public SmartScreen reputation. Defender remains enabled and every release still requires normal malware scanning.

## Internal certificate hierarchy

The persistent internal hierarchy was created on the controlled signing workstation with non-exportable RSA-3072 keys in `Cert:\CurrentUser\My`:

| Role | Subject | Thumbprint | Expires |
|---|---|---|---|
| Root CA | `CN=GRMetro Internal Code Signing Root CA, O=GRMetro Heating & Cooling` | `229A09B55ECF417B082F235AE7D301ADBCEF02B0` | 2036-11-05 |
| Code signer | `CN=GRMetro Internal Code Signing, O=GRMetro Heating & Cooling` | `D1106CCFB0DCE1ADF2E199E989CE89E76D2D1581` | 2029-11-05 |

Only public certificates and a public inventory were exported to:

```text
C:\Users\melis\GRMetro-Signing\authenticode\public
```

No PFX or private-key export exists. Loss of the Windows user profile or signing workstation therefore loses the private keys. The public certificates may be backed up freely; they cannot sign code.

The checked-in `scripts/windows/internal-authenticode-policy.json` pins both certificate thumbprints, public-certificate SHA-256 values, subjects, minimum remaining lifetime, and the approved timestamp authority. It contains no secret material.

## Trust deployment to a managed Windows host

Do not copy a private key to an application host. Copy these public files through an approved internal channel:

```text
grmetro-internal-code-signing-root-ca.cer
grmetro-internal-code-signing.cer
```

From an elevated Windows PowerShell 5.1 session, review the files and then run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-internal-authenticode-trust.ps1 `
  -PolicyPath .\scripts\windows\internal-authenticode-policy.json `
  -RootCertificatePath .\grmetro-internal-code-signing-root-ca.cer `
  -SigningCertificatePath .\grmetro-internal-code-signing.cer `
  -StoreScope LocalMachine `
  -ConfirmTrustInstallation
```

The script verifies certificate bytes, thumbprints, subjects, SHA-256 issuance, CA constraints, Code Signing EKU, and the pinned chain before changing trust. It installs the root only in `LocalMachine\Root` and the leaf only in `LocalMachine\TrustedPublisher`. It refuses a conflicting certificate with the same subject. Use `-WhatIf` to review the proposed stores without modifying them.

Machine-wide trust installation is a separate administrator-approved deployment action. It must occur before an Update Host accepts an internal-Authenticode-required package. It was deliberately not run while preparing this infrastructure.

## Signing a future release

The Windows SDK SignTool remains preferred when it is available. On the current signing workstation it is absent, so the signing helper uses Windows PowerShell 5.1 `Set-AuthenticodeSignature` with SHA-256 and the non-exportable certificate-store key. Windows PowerShell 5.1 accepts only the traditional HTTP Authenticode timestamp protocol; policy restricts that exception to an approved timestamp authority and the returned timestamp is itself cryptographically signed and verified. SignTool, when later installed, uses the same pinned policy automatically.

Pass the policy and external public root to the existing release creator:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\create-windows-release.ps1 `
  -Version <YYYY.M.D.N> `
  -Channel <testing-or-stable> `
  -ArtifactUrl <final-https-zip-url> `
  -SigningKeyPath <external-rsa-release-private-key> `
  -KeyId <approved-release-key-id> `
  -ReleaseNotesPath <reviewed-release-notes> `
  -AuthenticodePolicyPath .\scripts\windows\internal-authenticode-policy.json `
  -AuthenticodeRootCertificatePath C:\Users\melis\GRMetro-Signing\authenticode\public\grmetro-internal-code-signing-root-ca.cer
```

Supplying the policy automatically requires Authenticode. The build fails when the signer is missing, lacks its private key or Code Signing EKU, does not chain to the pinned root, has fewer than 60 validity days left, lacks a timestamp, or produces a mismatched signature. The release creator independently extracts and verifies the packaged native launcher before setting `authenticodeRequired: true` in signed feed metadata.

Routine application releases still require the external RSA release-feed key. Authenticode does not replace artifact SHA-256 validation, channel restrictions, anti-replay state, package-manifest verification, transactional rollback, or Defender scanning.

## Renewal and recovery

Begin signer renewal at least 180 days before 2029-11-05. On the same protected Windows user profile, use `provision-internal-authenticode.ps1 -Action RenewSigner` with a new versioned signing subject and a new empty external output directory. The command requires `-ConfirmSigningCertificateRenewal`, reuses the existing non-exportable root, and refuses subject or output collisions. Review and commit a new public policy, deploy the new leaf to `TrustedPublisher` alongside the old leaf, test a signed disposable release, and only then switch release signing. Retain the old publisher certificate until every timestamped and untimestamped artifact retention requirement has passed.

Before the root expires in 2036, create a new hierarchy with a new subject, deploy its public root and publisher during an overlap window, and update policy. Because the current root key is non-exportable, workstation loss requires a new root and a controlled trust rollout; there is no private-key recovery file.

Use this read-only inspection command at any time:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\provision-internal-authenticode.ps1 -Action Inspect
```

Never commit, upload, print, or package private key material. Never use a self-signed certificate as evidence of public publisher identity.
