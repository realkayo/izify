[CmdletBinding()]
param([Parameter(Position=0)][ValidateSet('uninstall')][string]$Command,
    [switch]$Restart, [switch]$Watch, [switch]$Once, [string]$SpotifyPath, [switch]$BuildOnly,
    [switch]$Monitor, [switch]$AttachOnly, [switch]$RequireRunning, [switch]$Quiet)
$ErrorActionPreference = 'Stop'
if ($Command -eq 'uninstall') { & (Join-Path $PSScriptRoot 'uninstall.ps1') -Destination $PSScriptRoot -DeferCmdRemoval; return }
. (Join-Path $PSScriptRoot 'tools/bundle.ps1')
. (Join-Path $PSScriptRoot 'tools/cdp.ps1')
. (Join-Path $PSScriptRoot 'tools/auto-start.ps1')
. (Join-Path $PSScriptRoot 'tools/download-bridge.ps1')
if ($BuildOnly) { & (Join-Path $PSScriptRoot 'build.ps1'); return }
function Get-SpotifyTarget {
    try {
        $targets = Invoke-RestMethod 'http://127.0.0.1:9222/json/list' -TimeoutSec 2
        $targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'https://xpui.app.spotify.com/*' -and $_.webSocketDebuggerUrl -like 'ws://127.0.0.1:9222/devtools/page/*' } | Select-Object -First 1
    } catch { return $null }
}
function Get-SourceSignature {
    param([string]$Root = $PSScriptRoot)
    (Get-IzifyBundleFiles -Root $Root | ForEach-Object {
        $file = Get-Item -LiteralPath $_; '{0}:{1}:{2}' -f $file.FullName, $file.LastWriteTimeUtc.Ticks, $file.Length
    }) -join '|'
}
if ($Monitor) {
    Invoke-IzifyMonitor -Root $PSScriptRoot
    return
}
$installation = Assert-IzifySpotifyDesktop -SpotifyPath $SpotifyPath
$SpotifyPath = $installation.Path
# An already-open Store client must not be injected or stopped, even if it exposes CDP.
$openProcesses = @(Get-Process -Name Spotify -ErrorAction SilentlyContinue)
if ($openProcesses | Where-Object { try { $_.Path -match '(?i)[\\/]WindowsApps[\\/]' } catch { $false } }) {
    throw 'Microsoft Store nao suportada. Feche essa versao e abra o Spotify Desktop: https://download.scdn.co/SpotifySetup.exe'
}
$target = Get-SpotifyTarget
if (-not $target) {
    if ($AttachOnly) { throw 'Spotify CDP is unavailable; attach cancelled.' }
    $processes = @($openProcesses | Where-Object { try { $_.Path -ieq $SpotifyPath } catch { $false } })
    if ($RequireRunning -and -not $processes.Count) { return }
    if (-not $SpotifyPath) { $SpotifyPath = Get-IzifySpotifyExecutable }
    if (-not $SpotifyPath -or -not (Test-Path -LiteralPath $SpotifyPath -PathType Leaf) -or [System.IO.Path]::GetFileName($SpotifyPath) -ine 'Spotify.exe') {
        throw 'Spotify Desktop not found. Use -SpotifyPath with the path to Spotify.exe.'
    }
    if ($processes.Count) {
        if (-not $Restart) {
            $answer = Read-Host 'Spotify is open without CDP. Restart it? [s/N]'
            if ($answer -notmatch '^(s|sim|y|yes)$') { throw 'Restart cancelled. Close Spotify or use -Restart.' }
        }
        $processes | Stop-Process
        $processes | Wait-Process -Timeout 10 -ErrorAction SilentlyContinue
        if (Get-Process -Name Spotify -ErrorAction SilentlyContinue) { throw 'Close Spotify manually and retry.' }
    }
    Start-Process -FilePath $SpotifyPath -ArgumentList '--remote-debugging-port=9222','--remote-debugging-address=127.0.0.1' -WindowStyle Hidden
}
$deadline = [DateTime]::UtcNow.AddSeconds(40)
do { $target = Get-SpotifyTarget; if ($target) { break }; Start-Sleep -Milliseconds 500 } while ([DateTime]::UtcNow -lt $deadline)
if (-not $target) { throw 'Spotify XPUI did not expose CDP on localhost:9222.' }
$lastSignature = ''; $lastTarget = ''; $attempts = 0; $failedSignature = ''; $missing = $false
if (-not $Quiet) { Write-Host '[Izify] PowerShell runner. Ctrl+C stops watching; no Python or Node required.' }
do {
    $target = Get-SpotifyTarget
    if (-not $target) {
        if ($Once) { throw 'Spotify renderer disappeared.' }
        if (-not $missing) { Write-Host '[Izify] Waiting for Spotify renderer...'; $missing = $true }
        Start-Sleep -Seconds 1; continue
    }
    $missing = $false
    $signature = Get-SourceSignature
    $loaded = $false
    if ($lastTarget -eq $target.id -and $lastSignature) {
        try { $loaded = (Invoke-IzifyExpression $target.webSocketDebuggerUrl 'window.__spotifyJsRunner === true') -eq $true } catch { Start-Sleep -Seconds 1; continue }
    }
    $changed = $Watch -and $signature -ne $lastSignature
    if (-not $loaded -or $changed) {
        $failureKey = $target.id + ':' + $signature
        if ($failureKey -ne $failedSignature) { $attempts = 0; $failedSignature = $failureKey }
        if ($attempts -lt 3) {
            try {
                $result = Invoke-IzifyExpression $target.webSocketDebuggerUrl (Get-IzifyBundle -Root $PSScriptRoot)
                if (-not $Quiet) { Write-Host "[OK] $result" }
                $lastSignature = $signature; $lastTarget = $target.id; $attempts = 0
            } catch {
                $attempts++; Write-Warning $_.Exception.Message
                if ($Once) { throw }
                if ($attempts -eq 3) { Write-Warning 'Three failures; edit a source file or restart the runner to retry.' }
            }
        }
    }
    if (-not $Once) {
        try { Invoke-IzifyDownloadPump -Endpoint $target.webSocketDebuggerUrl -Root $PSScriptRoot }
        catch { if (-not $Quiet) { Write-Warning ('Download bridge: ' + $_.Exception.Message) } }
        Start-Sleep -Milliseconds 1500
    }
} while (-not $Once)
