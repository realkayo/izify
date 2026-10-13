[CmdletBinding()]
param([string]$Output)
$ErrorActionPreference = 'Stop'
if (-not $Output) { $Output = Join-Path $PSScriptRoot 'dist/izify.bundle.js' }
. (Join-Path $PSScriptRoot 'tools/bundle.ps1')
$destination = [System.IO.Path]::GetFullPath($Output)
[void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destination))
[System.IO.File]::WriteAllText($destination, (Get-IzifyBundle -Root $PSScriptRoot), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[OK] $destination"
