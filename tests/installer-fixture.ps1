param([string]$ProjectDirectory, [string]$FixtureRoot, [switch]$RejectStore)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$script:installerLines = @()
function Write-Host { param([string]$Object) $script:installerLines += $Object; Write-Output $Object }
function Assert-Test($Value, $Message) { if (-not $Value) { throw $Message } }
Assert-Test ((Get-ExecutionPolicy) -eq 'Restricted') 'Test must start with Restricted policy.'
$env:LOCALAPPDATA = Join-Path $FixtureRoot 'Local'
$env:APPDATA = Join-Path $FixtureRoot 'Roaming'
$fakeSpotify = Join-Path $env:APPDATA 'Spotify/Spotify.exe'
if (-not $RejectStore) {
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($fakeSpotify))
    [IO.File]::WriteAllText($fakeSpotify, 'Fixture: never executed')
} else {
    $fakeAlias = Join-Path $env:LOCALAPPDATA 'Microsoft/WindowsApps/Spotify.exe'
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($fakeAlias))
    [IO.File]::WriteAllText($fakeAlias, '')
    function Get-Process { @() }
    function Get-AppxPackage { [pscustomobject]@{Name='SpotifyAB.SpotifyMusic'} }
}
$script:pauses = 0
function Read-Host { param($Prompt) $script:pauses++; return '' }
$desktop = Join-Path $FixtureRoot 'Desktop'
$programs = Join-Path $FixtureRoot 'Programs'
$startup = Join-Path $FixtureRoot 'Startup'
$script:downloads = @()
$commitSha = '0123456789abcdef0123456789abcdef01234567'
$baseUrl = 'https://raw.githubusercontent.com/realkayo/izify/' + $commitSha + '/'
$installerSource = [IO.File]::ReadAllText((Join-Path $ProjectDirectory 'install.ps1'), [Text.Encoding]::UTF8)
# The test exercises the default integration. Only global PATH changes are suppressed.
$installerSource = $installerSource.Replace('[switch]$NoPath,', '[switch]$NoPath = $true,')

function Invoke-RestMethod {
    param([string]$Uri, $Headers)
    if ($Uri -eq 'https://raw.githubusercontent.com/realkayo/izify/main/install.ps1') { return $installerSource }
    if ($Uri -eq 'https://api.github.com/repos/realkayo/izify/commits/main') { return @{sha=$commitSha} }
    throw ('Unexpected installer API call: ' + $Uri)
}
function Invoke-WebRequest {
    param([string]$Uri, [switch]$UseBasicParsing)
    Assert-Test ($Uri.StartsWith($baseUrl)) 'All downloads must use the pinned commit.'
    $relative = $Uri.Substring($baseUrl.Length)
    $script:downloads += $relative
    if ($relative -match '\.(png|jpg)$') { return [pscustomobject]@{RawContentStream=[IO.MemoryStream]::new([IO.File]::ReadAllBytes((Join-Path $ProjectDirectory $relative)))} }
    $text = [IO.File]::ReadAllText((Join-Path $ProjectDirectory $relative), [Text.Encoding]::UTF8)
    if ($relative -eq 'tools/auto-start.ps1') {
        # Retain real compilation and shortcut operations; isolate their destinations
        # and intercept background launch so the test never opens or restarts Spotify.
        $text += @'

${function:OriginalSetShortcuts} = ${function:Set-IzifySpotifyShortcuts}
${function:OriginalNewShortcuts} = ${function:New-IzifySpotifyShortcuts}
${function:OriginalAutoStart} = ${function:Install-IzifyAutoStart}
function Set-IzifySpotifyShortcuts { param($Root) OriginalSetShortcuts -Root $Root -Directories @($desktop,$programs) }
function New-IzifySpotifyShortcuts { param($Root,$SpotifyPath) OriginalNewShortcuts -Root $Root -SpotifyPath $SpotifyPath -Directories @($desktop,$programs) }
function Install-IzifyAutoStart { param($Root) OriginalAutoStart -Root $Root -StartupDirectory $startup }
function Start-IzifyMonitor { param($Root) [IO.File]::WriteAllText((Join-Path $Root 'monitor-started.txt'), 'started') }
function Restart-IzifySpotifyDesktop {
    param($SpotifyPath)
    Assert-Test ($SpotifyPath -eq $fakeSpotify) 'Installer must restart only the supported desktop executable.'
    Assert-Test (Test-Path -LiteralPath (Join-Path $Destination 'monitor-started.txt')) 'Configure the monitor before restarting Spotify.'
    [IO.File]::WriteAllText((Join-Path $Destination 'restart-requested.txt'), $SpotifyPath)
}
'@
    }
    $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    return [pscustomobject]@{RawContentStream=[IO.MemoryStream]::new($bytes)}
}

# The same public command, no SourceRoot/Destination/AutoStart arguments.
try {
    irm https://raw.githubusercontent.com/realkayo/izify/main/install.ps1 | iex
    if ($RejectStore) { throw 'Store installation unexpectedly succeeded.' }
} catch {
    if (-not $RejectStore) { throw }
    Assert-Test ($_.Exception.Message.Contains('https://download.scdn.co/SpotifySetup.exe')) 'Unsupported client error must show the direct desktop download.'
    Assert-Test ($script:pauses -eq 1) 'Failure must wait for acknowledgment instead of closing the console immediately.'
    Assert-Test (-not (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'Izify'))) 'Store rejection must happen before installed files/shortcuts are changed.'
    Write-Host 'PASS: Store rejected, alias ignored, direct desktop link, no installation side effects, console waits on failure.'
    return
}

$installed = Join-Path $env:LOCALAPPDATA 'Izify'
Assert-Test ($script:downloads.Count -eq 40) 'Remote installation did not fetch the complete package.'
foreach ($file in @('src/core/themes.js','src/core/gaara.js','assets/themes/gaara/seal.svg','assets/themes/gaara/gourd.svg','assets/themes/gaara/liked-songs.svg','plugins/download.js','src/core/download-bridge.js','tools/download-bridge.ps1','tools/download-worker.ps1','assets/icons/download.svg','assets/icons/LICENSE')) {
    Assert-Test (Test-Path -LiteralPath (Join-Path $installed $file)) ('Download package missing: ' + $file)
}
foreach ($file in @('assets/themes/kuromi/head.png','assets/themes/kuromi/wallpaper.png','assets/themes/kuromi/liked-songs.png','assets/themes/gaara/head.png','assets/themes/gaara/wallpaper.jpg')) {
    Assert-Test ((Get-FileHash -LiteralPath (Join-Path $installed $file)).Hash -eq (Get-FileHash -LiteralPath (Join-Path $ProjectDirectory $file)).Hash) ('Binary theme asset changed during installation: ' + $file)
}
Assert-Test (Test-Path -LiteralPath (Join-Path $installed 'uninstall.ps1')) 'Uninstaller must be included in remote installation.'
Assert-Test (Test-Path -LiteralPath (Join-Path $installed 'Izify.Launcher.exe')) 'Default installation must compile the native launcher.'
Assert-Test (Test-Path -LiteralPath (Join-Path $installed 'monitor-started.txt')) 'Default installation must start the monitor immediately.'
Assert-Test ((Get-ExecutionPolicy) -eq 'Restricted') 'Installer must leave execution policy unchanged.'
Assert-Test (($script:installerLines -join "`n").Contains(([IO.File]::ReadAllText((Join-Path $ProjectDirectory 'assets/logo.txt'), [Text.Encoding]::UTF8)).TrimEnd())) 'Installer must print the actual ASCII logo.'
Assert-Test (($script:installerLines -join "`n") -match '\[DETECTADO\].*Spotify Desktop \(instalador do site\)') 'Installer must report the detected desktop distribution.'
Assert-Test (Test-Path -LiteralPath (Join-Path $installed 'restart-requested.txt')) 'Successful installation must restart Spotify automatically.'
$script:IzifyInstallerAnsi = $true
Write-IzifyInstall 'Teste de cor'
Assert-Test (-not $script:installerLines[-1].Contains(([char]27 + '[38;2;255;168;209m'))) 'Regular logs must not use pastel pink.'
Write-IzifyInstall 'ASCII' '' -Logo
Assert-Test ($script:installerLines[-1].Contains(([char]27 + '[38;2;255;168;209m'))) 'Only ASCII art must use pastel pink.'
$shell = New-Object -ComObject WScript.Shell
try {
    foreach ($directory in @($desktop,$programs)) {
        $shortcut = $shell.CreateShortcut((Join-Path $directory 'Spotify.lnk'))
        Assert-Test ($shortcut.TargetPath -eq (Join-Path $installed 'Izify.Launcher.exe')) 'Fresh user Spotify shortcut points to the wrong installation.'
    }
    $login = $shell.CreateShortcut((Join-Path $startup 'Izify.lnk'))
    Assert-Test ($login.TargetPath -eq (Join-Path $installed 'Izify.Launcher.exe') -and $login.Arguments -eq '--monitor') 'Future Windows sign-ins must start the installed monitor.'
} finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
Write-Host 'PASS: one-command remote install, fresh user paths, Restricted policy, native launcher, Spotify shortcuts, immediate monitor, Windows startup.'
