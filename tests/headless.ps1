[CmdletBinding()]
param([string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe')
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ChromePath -PathType Leaf)) { throw 'Chrome not found. Use -ChromePath.' }
$root = Split-Path $PSScriptRoot -Parent
$body = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'fixture.html'))
$server = Start-Job -ArgumentList (,$body) -ScriptBlock {
    param([byte[]]$Body)
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    Write-Output $listener.LocalEndpoint.Port
    try {
        while ($true) {
            if (-not $listener.Pending()) { Start-Sleep -Milliseconds 50; continue }
            $client = $listener.AcceptTcpClient()
            try {
                $client.ReceiveTimeout = 800
                $stream = $client.GetStream()
                $buffer = New-Object byte[] 8192
                [void]$stream.Read($buffer, 0, $buffer.Length)
                $header = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n")
                $stream.Write($header, 0, $header.Length)
                $stream.Write($Body, 0, $Body.Length)
            } catch { } finally { $client.Close() }
        }
    } finally { $listener.Stop() }
}
$chrome = $null; $session = $null
try {
    $port = $null
    for ($i=0; $i -lt 100; $i++) {
        $output = Receive-Job $server
        if ($output) { $port = [int]$output[0]; break }
        if ($server.State -eq 'Failed') { throw 'Fixture server failed.' }
        Start-Sleep -Milliseconds 100
    }
    if (-not $port) { throw 'Fixture server timeout.' }
    $artifacts = Join-Path $root '.test-artifacts/compact'
    $profile = Join-Path $artifacts ('profile-' + [Guid]::NewGuid().ToString('N'))
    [void][IO.Directory]::CreateDirectory($profile)
    $url = "http://127.0.0.1:$port/"
    $response = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -ne 200 -or $response.Content -notmatch 'id="main"') { throw ('Fixture HTTP content invalid: ' + $response.Content) }
    $chrome = Start-Process -FilePath $ChromePath -ArgumentList @('--headless=new','--disable-gpu','--disable-extensions','--no-first-run','--remote-debugging-port=0',('"--user-data-dir=' + $profile + '"'),$url) -WindowStyle Hidden -PassThru
    $activePort = Join-Path $profile 'DevToolsActivePort'
    $fixtureReady = $false
    for ($i=0; $i -lt 100; $i++) {
        if (Test-Path -LiteralPath $activePort) { break }
        Start-Sleep -Milliseconds 100
    }
    $debugPort = [int](Get-Content -LiteralPath $activePort -TotalCount 1)
    . (Join-Path $root 'tools/cdp.ps1')
    for ($i=0; $i -lt 100; $i++) {
        $tabs = Invoke-RestMethod "http://127.0.0.1:$debugPort/json/list"
        $fixture = $tabs | Where-Object { $_.type -eq 'page' -and $_.url -eq $url } | Select-Object -First 1
        if ($fixture) {
            try { if (Invoke-IzifyExpression $fixture.webSocketDebuggerUrl "document.readyState === 'complete' && !!document.getElementById('main')") { $fixtureReady = $true; break } } catch {}
        }
        Start-Sleep -Milliseconds 100
    }
    if (-not $fixtureReady) { throw 'Fixture page did not load.' }
    if ($server.State -eq 'Failed') { Receive-Job $server; throw 'Fixture server failed.' }
    $nativeCss = ''
    $spotifyArchive = Join-Path $env:APPDATA 'Spotify/Apps/xpui.spa'
    if (Test-Path -LiteralPath $spotifyArchive) {
        # Read installed CSS without starting or modifying Spotify.
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [IO.Compression.ZipFile]::OpenRead($spotifyArchive)
        try {
            $entry = $archive.GetEntry('xpui-snapshot.css')
            if ($entry) { $reader = New-Object IO.StreamReader($entry.Open()); try { $nativeCss = $reader.ReadToEnd() } finally { $reader.Dispose() } }
        } finally { $archive.Dispose() }
    }
    & (Join-Path $PSScriptRoot 'smoke.ps1') -Port $debugPort -NativeCss $nativeCss
} finally {
    if ($chrome -and -not $chrome.HasExited) {
        try {
            $ports = Get-Content -LiteralPath $activePort
            $browserUrl = 'ws://127.0.0.1:' + $ports[0] + $ports[1]
            Invoke-IzifyCdp $browserUrl 'Browser.close' -TimeoutSeconds 3 | Out-Null
        } catch { Stop-Process -Id $chrome.Id -ErrorAction SilentlyContinue }
    }
    Stop-Job $server; Remove-Job $server
}
