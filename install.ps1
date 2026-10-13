[CmdletBinding()]
param(
    [string]$SourceRoot,
    [string]$Destination = (Join-Path $env:LOCALAPPDATA 'Izify'),
    [switch]$NoPath,
    [switch]$Launch
)
$ErrorActionPreference = 'Stop'
if (-not $SourceRoot) { $SourceRoot = $PSScriptRoot }
$files = @('run.ps1','build.ps1','tools/bundle.ps1','tools/cdp.ps1',
    'izify-ui.js','src/ui.css','src/panel-extras.js','src/core/logs.js','src/core/storage.js',
    'src/core/plugins.js','assets/logo.txt','plugins/ad-block.js','plugins/example.js','probe.js')
$local = $SourceRoot -and (Test-Path -LiteralPath (Join-Path $SourceRoot 'run.ps1') -PathType Leaf)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$Destination = [System.IO.Path]::GetFullPath($Destination)
$manifest = @{}
if ($local) {
    foreach ($file in $files) {
        $manifest[$file] = [System.IO.File]::ReadAllText((Join-Path $SourceRoot $file), $utf8)
    }
} else {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    try {
        $commit = Invoke-RestMethod 'https://api.github.com/repos/realkayo/izify/commits/main' -Headers @{ 'User-Agent' = 'Izify-Installer' }
        if ($commit.sha -notmatch '^[a-f0-9]{40}$') { throw 'Invalid commit response.' }
        $base = 'https://raw.githubusercontent.com/realkayo/izify/' + $commit.sha + '/'
        # Download a consistent commit completely before replacing installed files.
        foreach ($file in $files) {
            $response = Invoke-WebRequest ($base + $file) -UseBasicParsing
            $stream = $response.RawContentStream
            $stream.Position = 0
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            try { $manifest[$file] = $reader.ReadToEnd() } finally { $reader.Dispose() }
        }
    } catch { throw ('Publish the Izify scripts to realkayo/izify (main) first. Download failed: ' + $_.Exception.Message) }
}
foreach ($file in $files) {
    $target = [System.IO.Path]::GetFullPath((Join-Path $Destination $file))
    if (-not $target.StartsWith($Destination + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid package path.' }
    [void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target))
    [System.IO.File]::WriteAllText($target, $manifest[$file], $utf8)
}
$shim = '@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*' + "`r`n" + '@exit /b %ERRORLEVEL%' + "`r`n"
[System.IO.File]::WriteAllText((Join-Path $Destination 'izify.cmd'), $shim, [System.Text.Encoding]::ASCII)
if (-not $NoPath) {
    $current = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = @($current -split ';' | Where-Object { $_ })
    if (-not ($entries | Where-Object { $_.TrimEnd('\') -ieq $Destination.TrimEnd('\') })) {
        [Environment]::SetEnvironmentVariable('Path', (($entries + $Destination) -join ';'), 'User')
    }
    if (-not (($env:Path -split ';') | Where-Object { $_.TrimEnd('\') -ieq $Destination.TrimEnd('\') })) { $env:Path += ';' + $Destination }
}
Write-Host "[OK] Izify installed: $Destination"
Write-Host 'Run: izify -Watch (or izify -Restart -Watch to allow restarting Spotify).'
if ($Launch) { & (Join-Path $Destination 'run.ps1') }
