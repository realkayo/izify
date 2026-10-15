# Windows PowerShell 5.1. Only runs after Spotify is opened by the user.
function Get-IzifySpotifyExecutable {
    $desktopExe = Join-Path $env:APPDATA 'Spotify/Spotify.exe'
    if (Test-Path -LiteralPath $desktopExe -PathType Leaf) { return $desktopExe }
    foreach ($proc in @(Get-Process -Name Spotify -ErrorAction SilentlyContinue)) {
        try { if ($proc.Path -and $proc.Path -notmatch '(?i)[\\/]WindowsApps[\\/]' -and [IO.Path]::GetFileName($proc.Path) -ieq 'Spotify.exe') { return $proc.Path } } catch {}
    }
    return $null
}

function Get-IzifySpotifyInstallation {
    param([string]$SpotifyPath)
    if (-not $SpotifyPath) { $SpotifyPath = Get-IzifySpotifyExecutable }
    $kind = 'missing'; $label = 'Spotify nao encontrado'; $version = ''
    if ($SpotifyPath) {
        if ($SpotifyPath -match '(?i)[\\/]WindowsApps[\\/]') {
            $kind = 'store'; $label = 'Spotify Desktop da Microsoft Store'
        } else {
            $kind = 'desktop'; $label = 'Spotify Desktop (instalador do site)'
            try { $version = (Get-Item -LiteralPath $SpotifyPath).VersionInfo.ProductVersion } catch {}
        }
    } elseif ((Get-Command Get-AppxPackage -ErrorAction SilentlyContinue) -and (Get-AppxPackage -Name 'SpotifyAB.SpotifyMusic' -ErrorAction SilentlyContinue)) {
        # Detection is only for a clear rejection. No Store executable is launched.
        $kind = 'store'; $label = 'Spotify da Microsoft Store (nao suportado)'
    }
    [pscustomobject]@{Kind=$kind; Label=$label; Path=$SpotifyPath; Version=$version}
}

function Assert-IzifySpotifyDesktop {
    param([string]$SpotifyPath)
    $installation = Get-IzifySpotifyInstallation -SpotifyPath $SpotifyPath
    if ($installation.Kind -ne 'desktop' -or -not $installation.Path -or -not (Test-Path -LiteralPath $installation.Path -PathType Leaf) -or [IO.Path]::GetFileName($installation.Path) -ine 'Spotify.exe') {
        throw 'Izify aceita apenas o Spotify Desktop do site. Microsoft Store nao e suportada. Baixe: https://download.scdn.co/SpotifySetup.exe'
    }
    return $installation
}

function Restart-IzifySpotifyDesktop {
    param([Parameter(Mandatory)][string]$SpotifyPath)
    $installation = Assert-IzifySpotifyDesktop -SpotifyPath $SpotifyPath
    $processes = @(Get-Process -Name Spotify -ErrorAction SilentlyContinue | Where-Object {
        try { $_.Path -ieq $installation.Path } catch { $false }
    })
    if ($processes.Count) {
        $processes | Stop-Process -ErrorAction Stop
        $processes | Wait-Process -Timeout 10 -ErrorAction SilentlyContinue
        if ($processes | Where-Object { try { -not $_.HasExited } catch { $false } }) { throw 'Nao foi possivel encerrar o Spotify Desktop para concluir a instalacao.' }
    }
    Start-Process -FilePath $installation.Path -ArgumentList '--remote-debugging-port=9222','--remote-debugging-address=127.0.0.1'
}

function Write-IzifyMonitorStatus {
    param([string]$Root, [string]$State, [string]$Message, [string]$Kind = '')
    $record = @{state=$State; message=$Message; spotifyType=$Kind; time=[DateTime]::UtcNow.ToString('o')}
    $utf8 = New-Object Text.UTF8Encoding($false)
    [IO.File]::WriteAllText((Join-Path $Root 'auto-start-status.json'), ($record | ConvertTo-Json -Compress), $utf8)
    $logPath = Join-Path $Root 'auto-start.log'
    if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -gt 65536) { [IO.File]::WriteAllText($logPath, '') }
    [IO.File]::AppendAllText($logPath, ([DateTime]::UtcNow.ToString('s') + ' [' + $State + '] ' + $Message + [Environment]::NewLine), $utf8)
}

function ConvertTo-IzifyWindowsArgument {
    param([AllowEmptyString()][string]$Value)
    # CommandLineToArgvW quoting; Start-Process joins argument strings itself.
    '"' + (($Value -replace '(\\*)"', '$1$1\"') -replace '(\\+)$', '$1$1') + '"'
}

function Get-IzifySpotifyIcon {
    param([Parameter(Mandatory)][string]$SpotifyPath)
    return $SpotifyPath + ',0'
}

function Build-IzifyLauncher {
    param([Parameter(Mandatory)][string]$Root)
    $output = Join-Path $Root 'Izify.Launcher.exe'
    $temporary = Join-Path $Root ('launcher-' + [Guid]::NewGuid().ToString('N') + '.exe')
    try {
        Add-Type -Path (Join-Path $Root 'tools/launcher.cs') -OutputAssembly $temporary -OutputType WindowsApplication
        Move-Item -LiteralPath $temporary -Destination $output -Force
    } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
}

function Start-IzifyMonitor {
    param([Parameter(Mandatory)][string]$Root)
    Start-Process -FilePath (Join-Path $Root 'Izify.Launcher.exe') -ArgumentList '--monitor' -WindowStyle Hidden
}

function Stop-IzifyMonitor {
    param([Parameter(Mandatory)][string]$Root)
    $runner = Join-Path ([IO.Path]::GetFullPath($Root)) 'run.ps1'
    $pattern = '-File\s+"' + [regex]::Escape($runner) + '"\s+-Monitor(?:\s|$)'
    foreach ($process in @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'")) {
        if ($process.CommandLine -notmatch '\s-Command\s' -and $process.CommandLine -match $pattern) {
            Stop-Process -Id $process.ProcessId -ErrorAction Stop
        }
    }
}

function New-IzifySpotifyShortcuts {
    param([Parameter(Mandatory)][string]$Root, [Parameter(Mandatory)][string]$SpotifyPath,
        [string[]]$Directories = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs')))
    $shell = New-Object -ComObject WScript.Shell
    $backupPath = Join-Path $Root 'spotify-shortcuts.json'
    $backups = @()
    if (Test-Path -LiteralPath $backupPath) { $backups = @((Get-Content -LiteralPath $backupPath -Raw | ConvertFrom-Json) | ForEach-Object { $_ }) }
    try {
        foreach ($directory in $Directories | Select-Object -Unique) {
            [void][IO.Directory]::CreateDirectory($directory)
            $path = Join-Path $directory 'Spotify.lnk'
            # Preserve existing Spotify shortcuts, which Set-IzifySpotifyShortcuts updates.
            if (Test-Path -LiteralPath $path) { continue }
            $link = $shell.CreateShortcut($path)
            $link.TargetPath = Join-Path $Root 'Izify.Launcher.exe'
            $link.WorkingDirectory = $Root
            $link.IconLocation = Get-IzifySpotifyIcon -SpotifyPath $SpotifyPath
            $link.Description = 'Spotify with Izify'
            $link.Save()
            if (-not ($backups | Where-Object { $_.path -eq $path })) { $backups += @{path=$path; created=$true} }
        }
        [IO.File]::WriteAllText($backupPath, (ConvertTo-Json -InputObject @($backups) -Depth 4), (New-Object Text.UTF8Encoding($false)))
    } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
}

function Get-IzifyMonitorAction {
    param([bool]$Running, [bool]$HasTarget, [double]$Elapsed, [bool]$Notified)
    if (-not $Running) { return 'Idle' }
    if ($HasTarget) { return 'Attach' }
    if ($Elapsed -lt 45 -or $Notified) { return 'Wait' }
    return 'Report'
}

function Install-IzifyAutoStart {
    param([Parameter(Mandatory)][string]$Root,
        [string]$StartupDirectory = [Environment]::GetFolderPath('Startup'),
        [switch]$NoStart)
    $runner = Join-Path ([IO.Path]::GetFullPath($Root)) 'run.ps1'
    if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) { throw 'Installed runner not found.' }
    [void][IO.Directory]::CreateDirectory($StartupDirectory)
    $shell = New-Object -ComObject WScript.Shell
    try {
        $link = $shell.CreateShortcut((Join-Path $StartupDirectory 'Izify.lnk'))
        $link.TargetPath = Join-Path $Root 'Izify.Launcher.exe'
        $link.Arguments = '--monitor'
        $link.WorkingDirectory = $Root
        $link.Description = 'Load Izify whenever Spotify opens'
        $link.Save()
        if (-not $NoStart) {
            Start-IzifyMonitor -Root $Root
        }
    } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
}

function Set-IzifySpotifyShortcuts {
    param([Parameter(Mandatory)][string]$Root, [string[]]$Directories = @(
        [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'),
        (Join-Path $env:APPDATA 'Microsoft/Internet Explorer/Quick Launch/User Pinned/TaskBar')))
    $shell = New-Object -ComObject WScript.Shell
    $backups = @(); $backupPath = Join-Path $Root 'spotify-shortcuts.json'
    if (Test-Path -LiteralPath $backupPath) { $backups = @((Get-Content -LiteralPath $backupPath -Raw | ConvertFrom-Json) | ForEach-Object { $_ }) }
    try {
        foreach ($directory in $Directories | Select-Object -Unique) {
            if (-not $directory -or -not (Test-Path -LiteralPath $directory -PathType Container)) { continue }
            $recursive = $directory -ieq [Environment]::GetFolderPath('Programs')
            foreach ($file in Get-ChildItem -LiteralPath $directory -Filter '*.lnk' -File -Recurse:$recursive -ErrorAction SilentlyContinue) {
                try {
                    $link = $shell.CreateShortcut($file.FullName)
                    $isSpotify = [IO.Path]::GetFileName($link.TargetPath) -ieq 'Spotify.exe'
                    $isIzify = $link.TargetPath -ieq (Join-Path $Root 'Izify.Launcher.exe')
                    if (-not $isSpotify -and -not $isIzify) { continue }
                    if ($isSpotify -and $link.TargetPath -match '(?i)[\\/]WindowsApps[\\/]') { continue }
                    if ($isSpotify -and -not (Test-Path -LiteralPath $link.TargetPath -PathType Leaf)) { continue }
                    if ($file.FullName -ieq (Join-Path ([Environment]::GetFolderPath('Startup')) 'Izify.lnk')) { continue }
                    $original = $link.Arguments
                    if (-not ($backups | Where-Object { $_.path -eq $file.FullName })) {
                        $record = @{path=$file.FullName; target=$link.TargetPath; arguments=$original; created=$false}
                        if ($isSpotify) {
                            $record.backupFile = 'shortcut-backups/' + [Guid]::NewGuid().ToString('N') + '.lnk'
                            [void][IO.Directory]::CreateDirectory((Join-Path $Root 'shortcut-backups'))
                            Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $Root $record.backupFile)
                        }
                        $backups += $record
                    }
                    # Preserve URI and other original arguments; only set our CDP switches.
                    $arguments = $original -replace '--remote-debugging-port(?:=|\s+)\d+', '' -replace '--remote-debugging-address(?:=|\s+)\S+', ''
                    if ($isSpotify) { $link.IconLocation = Get-IzifySpotifyIcon -SpotifyPath $link.TargetPath }
                    $link.TargetPath = Join-Path $Root 'Izify.Launcher.exe'
                    $link.WorkingDirectory = $Root
                    $link.Arguments = $arguments.Trim()
                    $link.Save()
                } catch { Write-Warning ('Could not update Spotify shortcut: ' + $file.Name) }
            }
        }
        [IO.File]::WriteAllText($backupPath, (ConvertTo-Json -InputObject @($backups) -Depth 4), (New-Object Text.UTF8Encoding($false)))
    } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
}

function Invoke-IzifyMonitor {
    param([Parameter(Mandatory)][string]$Root, [string]$MutexName)
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    if (-not $MutexName) { $MutexName = 'Local\Izify.Monitor.' + $sid }
    $mutex = New-Object Threading.Mutex($false, $MutexName)
    $owned = $false
    try {
        try { $owned = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned = $true }
        if (-not $owned) { return }
        $seenAt = $null; $notified = $false; $failures = 0; $lastFailure = ''; $retryAfter = [DateTime]::MinValue
        $bundle = ''; $signature = ''; $loadedTarget = ''; $spotifyKind = ''
        while ($true) {
            try {
                $processes = @(Get-Process -Name Spotify -ErrorAction SilentlyContinue)
                if (-not $processes.Count) {
                    $seenAt = $null; $notified = $false; $loadedTarget = ''; $spotifyKind = ''; $failures = 0; $retryAfter = [DateTime]::MinValue
                } else {
                    if (-not $seenAt) {
                        $seenAt = [DateTime]::UtcNow
                        $path = $processes | ForEach-Object { try { $_.Path } catch {} } | Where-Object { $_ } | Select-Object -First 1
                        $spotifyKind = (Get-IzifySpotifyInstallation -SpotifyPath $path).Kind
                    }
                    if ($spotifyKind -ne 'desktop') {
                        if (-not $notified) {
                            Write-IzifyMonitorStatus -Root $Root -State 'unsupported' -Message 'Microsoft Store nao suportada. Baixe o Spotify Desktop: https://download.scdn.co/SpotifySetup.exe' -Kind $spotifyKind
                            $notified = $true
                        }
                    } else {
                        $target = Get-SpotifyTarget
                        $action = Get-IzifyMonitorAction -Running $true -HasTarget ([bool]$target) -Elapsed (([DateTime]::UtcNow - $seenAt).TotalSeconds) -Notified $notified
                        if ($action -eq 'Report') {
                            # Missing CDP is not permission to terminate an interactive application.
                            $notified = $true
                            $message = 'Spotify aberto sem depuracao. Izify aguardando; Spotify preservado. Feche o app pelo menu e abra pelo atalho Spotify criado pelo Izify.'
                            Write-IzifyMonitorStatus -Root $Root -State 'waiting-for-debugger' -Message $message -Kind $spotifyKind
                        } elseif ($action -eq 'Attach' -and [DateTime]::UtcNow -ge $retryAfter) {
                            $seenAt = [DateTime]::UtcNow
                            $ready = (Invoke-IzifyExpression $target.webSocketDebuggerUrl '!!document.documentElement && !!document.body') -eq $true
                            if (-not $ready) { Start-Sleep -Milliseconds 500; continue }
                            $currentSignature = Get-SourceSignature -Root $Root
                            if ($signature -ne $currentSignature) { $bundle = Get-IzifyBundle -Root $Root; $signature = $currentSignature; $loadedTarget = ''; $failures = 0 }
                            $present = $false
                            if ($loadedTarget -eq $target.id) {
                                $present = (Invoke-IzifyExpression $target.webSocketDebuggerUrl 'window.__spotifyJsRunner === true && !!window.izify') -eq $true
                            }
                            if (-not $present) {
                                Invoke-IzifyExpression $target.webSocketDebuggerUrl $bundle | Out-Null
                                $loadedTarget = $target.id
                                Write-IzifyMonitorStatus -Root $Root -State 'loaded' -Message 'Izify carregado. Nenhuma alteracao na reproducao.' -Kind $spotifyKind
                            }
                            $notified = $false
                            $failures = 0
                            if (Get-Command Invoke-IzifyDownloadPump -ErrorAction SilentlyContinue) {
                                Invoke-IzifyDownloadPump -Endpoint $target.webSocketDebuggerUrl -Root $Root
                            }
                        }
                    }
                }
            } catch {
                $failures++
                $retryAfter = [DateTime]::UtcNow.AddSeconds([Math]::Min(60, 5 * $failures))
                $message = $_.Exception.Message
                if ($message -ne $lastFailure) {
                    $lastFailure = $message
                    Write-IzifyMonitorStatus -Root $Root -State 'load-error' -Message ('Falha ao carregar Izify; Spotify preservado. ' + $message) -Kind $spotifyKind
                }
            }
            Start-Sleep -Seconds 2
        }
    } finally { if ($owned) { $mutex.ReleaseMutex() }; $mutex.Dispose() }
}
