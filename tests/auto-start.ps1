$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $root 'tools/auto-start.ps1')
function Assert-Test($Value, $Message) { if (-not $Value) { throw $Message } }
$destination = Join-Path $root ('.test-artifacts/auto start-' + [Guid]::NewGuid().ToString('N'))
& (Join-Path $root 'install.ps1') -SourceRoot $root -Destination $destination -NoPath -NoAutoStart
Assert-Test (Test-Path -LiteralPath (Join-Path $destination 'tools/auto-start.ps1')) 'Monitor was not packaged.'
Build-IzifyLauncher -Root $destination
$startup = Join-Path $destination 'startup'
Install-IzifyAutoStart -Root $destination -StartupDirectory $startup -NoStart
$shell = New-Object -ComObject WScript.Shell
try {
    $link = $shell.CreateShortcut((Join-Path $startup 'Izify.lnk'))
    Assert-Test ($link.Arguments -eq '--monitor' -and $link.TargetPath -eq (Join-Path $destination 'Izify.Launcher.exe')) 'Startup monitor arguments invalid.'
    $shortcuts = Join-Path $destination 'shortcuts'
    [void][IO.Directory]::CreateDirectory($shortcuts)
    $spotifyLink = $shell.CreateShortcut((Join-Path $shortcuts 'Spotify.lnk'))
    $spotifyLink.TargetPath = Join-Path $destination 'Spotify.exe'
    [IO.File]::WriteAllText($spotifyLink.TargetPath, 'test fixture, never executed')
    $spotifyLink.Arguments = 'spotify:track:fixture --other-option'
    $spotifyLink.Save()
    $otherLink = $shell.CreateShortcut((Join-Path $shortcuts 'Other.lnk'))
    $otherLink.TargetPath = Join-Path $destination 'Other.exe'; $otherLink.Arguments = 'keep'; $otherLink.Save()
    Set-IzifySpotifyShortcuts -Root $destination -Directories @($shortcuts)
    Set-IzifySpotifyShortcuts -Root $destination -Directories @($shortcuts)
    $spotifyLink = $shell.CreateShortcut((Join-Path $shortcuts 'Spotify.lnk'))
    Assert-Test ($spotifyLink.Arguments -eq 'spotify:track:fixture --other-option' -and $spotifyLink.TargetPath -eq (Join-Path $destination 'Izify.Launcher.exe')) 'Shortcut must preserve URI arguments and start the silent launcher.'
    Assert-Test ($shell.CreateShortcut((Join-Path $shortcuts 'Other.lnk')).Arguments -eq 'keep') 'Unrelated shortcut modified.'
    $backup = Get-Content -LiteralPath (Join-Path $destination 'spotify-shortcuts.json') -Raw | ConvertFrom-Json
    Assert-Test (@($backup).Count -eq 1 -and $backup[0].arguments -eq 'spotify:track:fixture --other-option') 'Original shortcut arguments not backed up.'
} finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }

# Launch the compiled GUI executable with an isolated script that records arguments.
$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $destination 'launch.ps1'), @'
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$SpotifyArguments)
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'launcher-args.json'), (ConvertTo-Json -InputObject $SpotifyArguments))
'@, $utf8)
$expectedArgs = @('spotify:track:fixture?x=a&y=b', 'path with spaces', 'quote"inside', 'trailing\')
$quotedArgs = @($expectedArgs | ForEach-Object { ConvertTo-IzifyWindowsArgument $_ })
Start-Process -FilePath (Join-Path $destination 'Izify.Launcher.exe') -ArgumentList $quotedArgs -WindowStyle Hidden -Wait
$capture = Join-Path $destination 'launcher-args.json'
for ($i=0; $i -lt 40 -and -not (Test-Path -LiteralPath $capture); $i++) { Start-Sleep -Milliseconds 100 }
Assert-Test (Test-Path -LiteralPath $capture) 'The silent native launcher did not execute its script.'
$capturedArgs = Get-Content -LiteralPath $capture -Raw | ConvertFrom-Json
Assert-Test (($capturedArgs -join '|') -ceq ($expectedArgs -join '|')) 'The silent launcher changed quoted arguments.'
Assert-Test ((Get-IzifyMonitorAction $false $false 90 $false) -eq 'Idle') 'Monitor must not open closed Spotify.'
Assert-Test ((Get-IzifyMonitorAction $true $true 0 $false) -eq 'Attach') 'An existing renderer must attach without restart.'
Assert-Test ((Get-IzifyMonitorAction $true $false 5 $false) -eq 'Wait') 'Spotify needs a startup grace period.'
Assert-Test ((Get-IzifyMonitorAction $true $false 12 $false) -eq 'Wait') 'Spotify must survive the old 12-second restart threshold.'
Assert-Test ((Get-IzifyMonitorAction $true $false 45 $false) -eq 'Report') 'Missing debugger must be reported without restart.'
Assert-Test ((Get-IzifyMonitorAction $true $false 90 $true) -eq 'Wait') 'Missing debugger must not be reported repeatedly.'
Assert-Test ((Get-IzifySpotifyInstallation -SpotifyPath 'C:\Program Files\WindowsApps\SpotifyAB.SpotifyMusic\Spotify.exe').Kind -eq 'store') 'Packaged executable must be detected as Microsoft Store.'
Assert-Test ((Get-IzifySpotifyInstallation -SpotifyPath (Join-Path $destination 'Spotify.exe')).Kind -eq 'desktop') 'Ordinary desktop executable must be detected separately.'
$rejected = $false
try { Assert-IzifySpotifyDesktop -SpotifyPath 'C:\Program Files\WindowsApps\SpotifyAB.SpotifyMusic\Spotify.exe' } catch { $rejected = $_.Exception.Message.Contains('https://download.scdn.co/SpotifySetup.exe') }
Assert-Test $rejected 'Store executable must be rejected with the supported download link.'

# Restart only the supported installation, keeping any unrelated/Store process untouched.
$script:stopped = @(); $script:launched = ''
$desktopProcess = [pscustomobject]@{Id=100;Path=(Join-Path $destination 'Spotify.exe');HasExited=$false}
$storeProcess = [pscustomobject]@{Id=200;Path='C:\Program Files\WindowsApps\SpotifyAB.SpotifyMusic\Spotify.exe';HasExited=$false}
function Get-Process { param($Name,$Id) if ($Id) { return }; @($desktopProcess,$storeProcess) }
function Stop-Process { [CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject) process { $script:stopped += $InputObject.Id; $InputObject.HasExited=$true } }
function Wait-Process { [CmdletBinding()]param([Parameter(ValueFromPipeline)]$InputObject,$Timeout) process {} }
function Start-Process { param($FilePath,$ArgumentList) $script:launched=$FilePath; Assert-Test ($ArgumentList -contains '--remote-debugging-port=9222') 'Restart must open with debugging.' }
Restart-IzifySpotifyDesktop -SpotifyPath $desktopProcess.Path
Assert-Test (($script:stopped -join ',') -eq '100' -and $script:launched -eq $desktopProcess.Path) 'Installation restart must be scoped to the desktop executable.'

# Exercise the actual resident loop through dependency mocks; no Spotify process is touched.
$script:step = 0; $script:injections = 0; $script:bundleReads = 0
function Get-Process { @([pscustomobject]@{ Path = 'fixture/Spotify.exe' }) }
function Get-SpotifyTarget { [pscustomobject]@{id='fixture'; webSocketDebuggerUrl='ws://127.0.0.1:9222/devtools/page/fixture'} }
function Get-SourceSignature { 'fixture-signature' }
function Get-IzifyBundle { $script:bundleReads++; 'fixture-bundle' }
function Invoke-IzifyExpression {
    param($Endpoint, $Expression)
    if ($Expression -eq 'fixture-bundle') { $script:injections++; return 'loaded' }
    if ($Expression -eq '!!document.documentElement && !!document.body') { return $script:step -ne 0 }
    # Simulate a renderer reload on the third poll.
    return $script:step -ne 2
}
function Start-Sleep { $script:step++; if ($script:step -ge 4) { throw 'Test monitor finished' } }
try { Invoke-IzifyMonitor -Root $destination -MutexName ('Local\Izify.Test.' + [Guid]::NewGuid().ToString('N')) } catch { if ($_.Exception.Message -ne 'Test monitor finished') { throw } }
Assert-Test ($script:injections -eq 2 -and $script:bundleReads -eq 1) 'Monitor must reinject on reload and reuse its compiled bundle.'

# Reproduce the user's failure: Spotify stays running, CDP never appears.
# Backdate the first sighting so the real loop goes past the reporting timeout.
$script:step = 0; $script:stops = 0; $script:starts = 0
function Stop-Process { $script:stops++; throw 'Automatic monitor must never stop Spotify' }
function Start-Process { $script:starts++; throw 'Automatic monitor must never reopen Spotify' }
function Get-SpotifyTarget { return $null }
function Get-IzifyMonitorAction {
    param($Running,$HasTarget,$Elapsed,$Notified)
    if (-not $Notified) { return 'Report' }
    return 'Wait'
}
try { Invoke-IzifyMonitor -Root $destination -MutexName ('Local\Izify.Test.' + [Guid]::NewGuid().ToString('N')) } catch { if ($_.Exception.Message -ne 'Test monitor finished') { throw } }
Assert-Test ($script:stops -eq 0 -and $script:starts -eq 0) 'Debugger failure must preserve the interactive app.'
$status = Get-Content -LiteralPath (Join-Path $destination 'auto-start-status.json') -Raw | ConvertFrom-Json
Assert-Test ($status.state -eq 'waiting-for-debugger') 'Missing debugger must have a readable status.'
$reports = @(Get-Content -LiteralPath (Join-Path $destination 'auto-start.log') | Where-Object { $_ -match '\[waiting-for-debugger\]' })
Assert-Test ($reports.Count -eq 1) 'Report must be emitted once, not on every poll.'
$script:step = 0; $script:targetQueries = 0
function Get-Process { @($storeProcess) }
function Get-SpotifyTarget { $script:targetQueries++; [pscustomobject]@{id='store'} }
try { Invoke-IzifyMonitor -Root $destination -MutexName ('Local\Izify.Test.' + [Guid]::NewGuid().ToString('N')) } catch { if ($_.Exception.Message -ne 'Test monitor finished') { throw } }
$status = Get-Content -LiteralPath (Join-Path $destination 'auto-start-status.json') -Raw | ConvertFrom-Json
Assert-Test ($script:targetQueries -eq 0 -and $status.state -eq 'unsupported') 'Store clients must be rejected before any attempt to connect or inject.'
Write-Host 'PASS: launcher, Store detection, startup, renderer reinjection, no automatic termination/restart, clear connection status.'
