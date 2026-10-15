$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
. (Join-Path $project 'tools/auto-start.ps1')
. (Join-Path $project 'tools/uninstall.ps1')
function Assert-Test($Value, $Message) { if (-not $Value) { throw $Message } }
$fixture = Join-Path $project ('.test-artifacts/uninstall-' + [Guid]::NewGuid().ToString('N'))
$destination = Join-Path $fixture 'installed'
& (Join-Path $project 'install.ps1') -SourceRoot $project -Destination $destination -NoPath -NoAutoStart
$desktop = Join-Path $fixture 'Desktop'
$startup = Join-Path $fixture 'Startup'
$roaming = Join-Path $fixture 'Roaming'
foreach ($directory in @($desktop,$startup,(Join-Path $roaming 'Spotify'))) { [void][IO.Directory]::CreateDirectory($directory) }
$spotify = Join-Path $roaming 'Spotify/Spotify.exe'
[IO.File]::WriteAllText($spotify, 'Fixture: Spotify must be preserved')
$shell = New-Object -ComObject WScript.Shell
try {
    $existing = Join-Path $desktop 'Custom Spotify.lnk'
    $link = $shell.CreateShortcut($existing); $link.TargetPath=$spotify; $link.Arguments='spotify:track:fixture'; $link.Description='Original description'; $link.WorkingDirectory=Split-Path $spotify; $link.Save()
    $originalBytes = [Convert]::ToBase64String([IO.File]::ReadAllBytes($existing))
    $unrelated = Join-Path $desktop 'Other.lnk'
    $link = $shell.CreateShortcut($unrelated); $link.TargetPath='C:\Windows\notepad.exe'; $link.Save()
    Set-IzifySpotifyShortcuts -Root $destination -Directories @($desktop)
    New-IzifySpotifyShortcuts -Root $destination -SpotifyPath $spotify -Directories @($desktop)
    Install-IzifyAutoStart -Root $destination -StartupDirectory $startup -NoStart
    $changed = Join-Path $desktop 'Changed by user.lnk'
    $link = $shell.CreateShortcut($changed); $link.TargetPath=$spotify; $link.Save()
    Set-IzifySpotifyShortcuts -Root $destination -Directories @($desktop)
    $link = $shell.CreateShortcut($changed); $link.TargetPath='C:\Windows\notepad.exe'; $link.Save()
    $userFile = Join-Path $destination 'user-notes.txt'; [IO.File]::WriteAllText($userFile, 'Preserve me')
    $outsideFile = Join-Path $fixture 'outside.txt'; [IO.File]::WriteAllText($outsideFile, 'Preserve outside')
    $refused = $false; try { Get-IzifyOwnedFile $destination '../outside.txt' } catch { $refused=$true }
    Assert-Test $refused 'Uninstaller must reject receipt paths outside its root.'
    $refused = $false; try { Uninstall-Izify -Root $project -NoPath -NoDetach } catch { $refused=$true }
    Assert-Test $refused 'Source repository must never be uninstalled.'
    Assert-Test ((Remove-IzifyPathEntry ('C:\Windows;' + $destination + ';' + $destination + '-other') $destination) -eq ('C:\Windows;' + $destination + '-other')) 'PATH cleanup must remove only the exact installation entry.'
    $savedRoaming = $env:APPDATA
    try {
        $env:APPDATA=$roaming
        Uninstall-Izify -Root $destination -NoPath -NoDetach -StartupDirectory $startup
    } finally { $env:APPDATA=$savedRoaming }
    Assert-Test (-not (Test-Path -LiteralPath (Join-Path $startup 'Izify.lnk'))) 'Startup entry must be removed.'
    Assert-Test ([Convert]::ToBase64String([IO.File]::ReadAllBytes($existing)) -eq $originalBytes) 'Original shortcut must be restored byte for byte.'
    Assert-Test ($shell.CreateShortcut((Join-Path $desktop 'Spotify.lnk')).TargetPath -eq $spotify) 'Created shortcut must become a regular Spotify shortcut.'
    Assert-Test ($shell.CreateShortcut($changed).TargetPath -eq 'C:\Windows\notepad.exe') 'Later user changes must be preserved.'
    Assert-Test ((Test-Path -LiteralPath $userFile) -and (Test-Path -LiteralPath $outsideFile) -and (Test-Path -LiteralPath $spotify) -and (Test-Path -LiteralPath $unrelated)) 'Only installed Izify files may be deleted.'
    Assert-Test (-not (Test-Path -LiteralPath (Join-Path $destination 'run.ps1')) -and -not (Test-Path -LiteralPath (Join-Path $destination 'izify-install.json')) -and -not (Test-Path -LiteralPath (Join-Path $destination 'shortcut-backups'))) 'Installed files, receipt and backups must be removed.'
} finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
# Exercise the real `izify uninstall` command, including deleting its own scripts/shim.
$cliRoot = Join-Path $fixture 'cli installed'
& (Join-Path $project 'install.ps1') -SourceRoot $project -Destination $cliRoot -NoPath -NoAutoStart
$entry = Join-Path $cliRoot 'uninstall.ps1'
[IO.File]::WriteAllText($entry, ([IO.File]::ReadAllText($entry).Replace('[switch]$NoPath,','[switch]$NoPath = $true,')), (New-Object Text.UTF8Encoding($false)))
$core = Join-Path $cliRoot 'tools/uninstall.ps1'
[IO.File]::AppendAllText($core, "`nfunction Disconnect-IzifyFromSpotify { param(`$Root) }`n")
& (Join-Path $cliRoot 'izify.cmd') uninstall
Assert-Test ($LASTEXITCODE -eq 0) 'CLI command must exit successfully.'
for ($i=0; $i -lt 40 -and (Test-Path -LiteralPath $cliRoot); $i++) { Start-Sleep -Milliseconds 100 }
Assert-Test (-not (Test-Path -LiteralPath $cliRoot)) 'CLI command must remove the installation, including its own scripts.'
Write-Host 'PASS: uninstall, exact shortcut restore, normal Spotify shortcut, startup cleanup, preserved user files/Spotify, guarded paths.'
