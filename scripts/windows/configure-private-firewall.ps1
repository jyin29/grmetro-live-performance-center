param(
  [Parameter(Mandatory=$true)][string]$NodePath,
  [int]$Port = 3000
)
$ErrorActionPreference = 'Stop'
$node = [IO.Path]::GetFullPath($NodePath)
if (-not (Test-Path -LiteralPath $node -PathType Leaf) -or [IO.Path]::GetFileName($node) -ne 'node.exe') {
  throw 'The bundled GRMetro Node runtime path is invalid.'
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Administrator approval is required to configure Windows Firewall.'
}
$name = 'GRMetro Performance Center (Private Network)'
Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $name -Description 'Allows phones and TV displays on the private LAN to reach GRMetro Performance Center.' -Direction Inbound -Action Allow -Enabled True -Profile Private -Protocol TCP -LocalPort $Port -Program $node | Out-Null
