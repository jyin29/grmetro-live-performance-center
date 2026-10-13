# Shared ServiceTitan Edge profile selection. Loading this file performs no
# filesystem mutation and never starts or stops a process.
function Test-GrMetroBrowserProfileEstablished([string]$Path) {
  if (-not $Path) { return $false }
  $resolved = [IO.Path]::GetFullPath($Path)
  if (-not (Test-Path -LiteralPath $resolved -PathType Container)) { return $false }
  try {
    return $null -ne (Get-ChildItem -LiteralPath $resolved -Force -ErrorAction Stop | Select-Object -First 1)
  } catch {
    throw "Could not inspect the ServiceTitan Edge profile path: $resolved"
  }
}

function Resolve-GrMetroServiceTitanProfilePath {
  param(
    [string]$ExplicitPath,
    [string]$LegacyProfilePath = 'C:\edge-dashboard-profile',
    [string]$LocalAppDataProfilePath = (Join-Path $env:LOCALAPPDATA 'GRMetro\Edge Profile')
  )

  if ($ExplicitPath) {
    $explicit = [IO.Path]::GetFullPath($ExplicitPath).TrimEnd('\')
    if (-not $explicit -or $explicit -eq [IO.Path]::GetPathRoot($explicit)) {
      throw 'The explicit ServiceTitan Edge profile path is unsafe.'
    }
    return $explicit
  }

  $legacy = [IO.Path]::GetFullPath($LegacyProfilePath).TrimEnd('\')
  $modern = [IO.Path]::GetFullPath($LocalAppDataProfilePath).TrimEnd('\')
  if ($legacy -eq $modern) { return $modern }

  $legacyEstablished = Test-GrMetroBrowserProfileEstablished $legacy
  $modernEstablished = Test-GrMetroBrowserProfileEstablished $modern
  if ($legacyEstablished -and $modernEstablished) {
    throw 'Both the legacy and LocalAppData ServiceTitan Edge profiles contain data. Specify -ProfilePath explicitly; GRMetro will not choose or migrate either profile automatically.'
  }
  if ($legacyEstablished) { return $legacy }
  if ($modernEstablished) { return $modern }
  return $modern
}

function Test-GrMetroEdgeCommandLineUsesProfile([string]$CommandLine,[string]$ProfilePath) {
  if (-not $CommandLine -or -not $ProfilePath) { return $false }
  $profile = [IO.Path]::GetFullPath($ProfilePath).TrimEnd('\')
  $quoted = '--user-data-dir="' + $profile + '"'
  $plain = '--user-data-dir=' + $profile
  if ($CommandLine.IndexOf($quoted,[StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
  $index = $CommandLine.IndexOf($plain,[StringComparison]::OrdinalIgnoreCase)
  if ($index -lt 0) { return $false }
  $end = $index + $plain.Length
  return $end -eq $CommandLine.Length -or [char]::IsWhiteSpace($CommandLine[$end])
}
