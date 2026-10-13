[CmdletBinding()]
param([Parameter(Mandatory)][string]$Script, [string]$Output)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'cdp.ps1')
$targets = Invoke-RestMethod 'http://127.0.0.1:9222/json/list' -TimeoutSec 3
$target = $targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'https://xpui.app.spotify.com/*' } | Select-Object -First 1
if (-not $target) { throw 'Spotify XPUI unavailable on localhost:9222.' }
$expression = [IO.File]::ReadAllText([IO.Path]::GetFullPath($Script), [Text.Encoding]::UTF8)
$result = Invoke-IzifyExpression -WebSocketUrl $target.webSocketDebuggerUrl -Expression $expression
$json = $result | ConvertTo-Json -Depth 40
if ($Output) {
    $destination = [IO.Path]::GetFullPath($Output)
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination))
    [IO.File]::WriteAllText($destination, $json, (New-Object Text.UTF8Encoding($false)))
} else { $json }
