[CmdletBinding()]
param([switch]$Restart, [switch]$Watch, [switch]$Once, [string]$SpotifyPath, [switch]$BuildOnly)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'tools/bundle.ps1')
. (Join-Path $PSScriptRoot 'tools/cdp.ps1')
if ($BuildOnly) { & (Join-Path $PSScriptRoot 'build.ps1'); return }
function Get-SpotifyTarget {
    try {
        $targets = Invoke-RestMethod 'http://127.0.0.1:9222/json/list' -TimeoutSec 2
        $targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'https://xpui.app.spotify.com/*' -and $_.webSocketDebuggerUrl -like 'ws://127.0.0.1:9222/devtools/page/*' } | Select-Object -First 1
    } catch { return $null }
}
function Get-SourceSignature {
    (Get-IzifyBundleFiles -Root $PSScriptRoot | ForEach-Object {
        $file = Get-Item -LiteralPath $_; '{0}:{1}:{2}' -f $file.FullName, $file.LastWriteTimeUtc.Ticks, $file.Length
    }) -join '|'
}
$target = Get-SpotifyTarget
if (-not $target) {
    $processes = @(Get-Process -Name Spotify -ErrorAction SilentlyContinue)
    if (-not $SpotifyPath) {
        foreach ($proc in $processes) { try { if ($proc.Path) { $SpotifyPath = $proc.Path; break } } catch {} }
    }
    if (-not $SpotifyPath) {
        foreach ($path in @((Join-Path $env:APPDATA 'Spotify/Spotify.exe'), (Join-Path $env:LOCALAPPDATA 'Microsoft/WindowsApps/Spotify.exe'))) {
            if (Test-Path -LiteralPath $path -PathType Leaf) { $SpotifyPath = $path; break }
        }
    }
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
Write-Host '[Izify] PowerShell runner. Ctrl+C stops watching; no Python or Node required.'
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
                Write-Host "[OK] $result"
                $lastSignature = $signature; $lastTarget = $target.id; $attempts = 0
            } catch {
                $attempts++; Write-Warning $_.Exception.Message
                if ($Once) { throw }
                if ($attempts -eq 3) { Write-Warning 'Three failures; edit a source file or restart the runner to retry.' }
            }
        }
    }
    if (-not $Once) { Start-Sleep -Milliseconds 1500 }
} while (-not $Once)
