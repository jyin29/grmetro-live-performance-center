function Get-GrMetroNodePath([string]$Root) {
  $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\')
  $nodePath = [IO.Path]::GetFullPath((Join-Path $rootPath 'runtime\node\node.exe'))
  if (-not $nodePath.StartsWith($rootPath + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Bundled Node runtime path escaped the installation root.'
  }
  if (-not (Test-Path -LiteralPath $nodePath -PathType Leaf)) {
    throw 'The bundled GRMetro Node runtime is missing. Run the latest GRMetro Setup EXE again.'
  }
  return $nodePath
}

function Test-GrMetroPortableRuntime([string]$Root) {
  try {
    $node = Get-GrMetroNodePath $Root
    $version = (& $node --version 2>$null).Trim()
    return ($LASTEXITCODE -eq 0 -and $version -match '^v\d+\.\d+\.\d+$')
  } catch {
    return $false
  }
}
