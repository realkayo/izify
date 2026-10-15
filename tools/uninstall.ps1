function Get-IzifyOwnedFile {
    param([string]$Root, [string]$Relative)
    $path = [IO.Path]::GetFullPath((Join-Path $Root $Relative))
    if (-not $path.StartsWith($Root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Caminho fora da instalacao do Izify.' }
    $check = $path
    while ($check -and $check.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
        if (Test-Path -LiteralPath $check) {
            $item = Get-Item -LiteralPath $check -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Links de arquivos/pastas nao sao removidos pelo desinstalador.' }
        }
        if ($check -ieq $Root) { break }
        $check = [IO.Path]::GetDirectoryName($check)
    }
    return $path
}

function Remove-IzifyPathEntry {
    param([string]$Value, [string]$Root)
    (@($Value -split ';' | Where-Object { $_.Trim().Trim('"').TrimEnd('\') -ine $Root.TrimEnd('\') }) -join ';')
}

function Stop-IzifyInstalledProcesses {
    param([string]$Root)
    $pattern = '-File\s+"' + [regex]::Escape($Root + '\') + '(run|launch)\.ps1"(?:\s|$)'
    foreach ($process in @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='Izify.Launcher.exe'")) {
        if ($process.ProcessId -eq $PID) { continue }
        $owned = $process.Name -eq 'Izify.Launcher.exe' -and $process.ExecutablePath -ieq (Join-Path $Root 'Izify.Launcher.exe')
        $owned = $owned -or ($process.Name -eq 'powershell.exe' -and $process.CommandLine -notmatch '\s-Command\s' -and $process.CommandLine -match $pattern)
        if ($owned) { Stop-Process -Id $process.ProcessId -ErrorAction Stop }
    }
}

function Disconnect-IzifyFromSpotify {
    param([string]$Root)
    . ([scriptblock]::Create([IO.File]::ReadAllText((Join-Path $Root 'tools/cdp.ps1'), [Text.Encoding]::UTF8)))
    try {
        $targets = Invoke-RestMethod 'http://127.0.0.1:9222/json/list' -TimeoutSec 2
        foreach ($target in $targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'https://xpui.app.spotify.com/*' -and $_.webSocketDebuggerUrl -like 'ws://127.0.0.1:9222/devtools/page/*' }) {
            Invoke-IzifyExpression $target.webSocketDebuggerUrl '(async()=>{if(window.__izify?.destroy)await window.__izify.destroy();delete window.__spotifyJsRunner;return true;})()' | Out-Null
        }
    } catch { Write-Warning 'Nao foi possivel limpar o renderer atual. Feche e abra o Spotify para concluir a remocao visual.' }
}

function Uninstall-Izify {
    param([Parameter(Mandatory)][string]$Root, [switch]$NoPath, [switch]$NoDetach, [switch]$DeferCmdRemoval,
        [string]$StartupDirectory = [Environment]::GetFolderPath('Startup'))
    $Root = [IO.Path]::GetFullPath($Root).TrimEnd('\')
    if ($Root -ieq [IO.Path]::GetPathRoot($Root).TrimEnd('\')) { throw 'A raiz de uma unidade nao pode ser desinstalada.' }
    if (Test-Path -LiteralPath (Join-Path $Root 'install.ps1')) { throw 'Esta pasta e o projeto, nao uma instalacao. Os arquivos do projeto foram preservados.' }
    $receiptPath = Get-IzifyOwnedFile $Root 'izify-install.json'
    if (-not (Test-Path -LiteralPath $receiptPath)) { throw 'Instalacao sem registro de propriedade. Atualize o Izify antes de desinstalar.' }
    $receipt = [IO.File]::ReadAllText($receiptPath) | ConvertFrom-Json
    if ($receipt.product -ne 'Izify' -or $receipt.root.TrimEnd('\') -ine $Root -or $receipt.version -ne 1) { throw 'Registro de instalacao invalido.' }
    $files = @($receipt.files | ForEach-Object { Get-IzifyOwnedFile $Root $_ })
    $backupPath = Get-IzifyOwnedFile $Root 'spotify-shortcuts.json'
    $records = @()
    if (Test-Path -LiteralPath $backupPath) { $records = @(([IO.File]::ReadAllText($backupPath) | ConvertFrom-Json) | ForEach-Object { $_ }) }
    foreach ($record in $records) { if ($record.backupFile) { $files += Get-IzifyOwnedFile $Root $record.backupFile } }

    Stop-IzifyInstalledProcesses -Root $Root
    if (-not $NoDetach) { Disconnect-IzifyFromSpotify -Root $Root }
    $shell = New-Object -ComObject WScript.Shell
    try {
        $startupPath = Join-Path $StartupDirectory 'Izify.lnk'
        if (Test-Path -LiteralPath $startupPath) {
            $link = $shell.CreateShortcut($startupPath)
            if ($link.TargetPath -ieq (Join-Path $Root 'Izify.Launcher.exe') -or $link.Arguments.Contains('"' + (Join-Path $Root 'run.ps1') + '"')) { Remove-Item -LiteralPath $startupPath -Force }
        }
        $desktopExe = Join-Path $env:APPDATA 'Spotify/Spotify.exe'
        foreach ($record in $records) {
            if (-not $record.path -or [IO.Path]::GetExtension($record.path) -ine '.lnk' -or $record.path -ieq $startupPath -or -not (Test-Path -LiteralPath $record.path)) { continue }
            $link = $shell.CreateShortcut($record.path)
            if ($link.TargetPath -ine (Join-Path $Root 'Izify.Launcher.exe')) { continue }
            if ($record.backupFile -and (Test-Path -LiteralPath (Get-IzifyOwnedFile $Root $record.backupFile))) {
                Copy-Item -LiteralPath (Get-IzifyOwnedFile $Root $record.backupFile) -Destination $record.path -Force
            } else {
                $target = $record.target
                # Older installers sometimes captured their own launcher as the original.
                if (-not $target -or $target -ieq (Join-Path $Root 'Izify.Launcher.exe')) { $target = $desktopExe }
                if (Test-Path -LiteralPath $target -PathType Leaf) {
                    $link.TargetPath = $target
                    $link.Arguments = ([string]$record.arguments -replace '--remote-debugging-port(?:=|\s+)\d+', '' -replace '--remote-debugging-address(?:=|\s+)\S+', '').Trim()
                    $link.WorkingDirectory = [IO.Path]::GetDirectoryName($target)
                    $link.IconLocation = $target + ',0'; $link.Description = 'Spotify'; $link.Save()
                } else { Remove-Item -LiteralPath $record.path -Force }
            }
        }
    } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
    if (-not $NoPath) {
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        [Environment]::SetEnvironmentVariable('Path', (Remove-IzifyPathEntry $userPath $Root), 'User')
        $env:Path = Remove-IzifyPathEntry $env:Path $Root
    }
    # Delete only receipt-owned files; never recursively delete the installation root.
    foreach ($file in $files | Select-Object -Unique) {
        if ($DeferCmdRemoval -and $file -ieq (Join-Path $Root 'izify.cmd')) { continue }
        if (Test-Path -LiteralPath $file -PathType Leaf) { Remove-Item -LiteralPath $file -Force }
    }
    $directories = @(@(foreach ($file in $files) {
        $directory = [IO.Path]::GetDirectoryName($file)
        while ($directory -and $directory.StartsWith($Root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            $directory
            $directory = [IO.Path]::GetDirectoryName($directory)
        }
    }) | Select-Object -Unique | Sort-Object { $_.Length } -Descending)
    foreach ($directory in $directories) {
        if (Test-Path -LiteralPath $directory -PathType Container) {
            if (-not @(Get-ChildItem -LiteralPath $directory -Force).Count) { Remove-Item -LiteralPath $directory -Force }
        }
    }
    if ((Test-Path -LiteralPath $Root) -and -not @(Get-ChildItem -LiteralPath $Root -Force).Count) { Remove-Item -LiteralPath $Root -Force }
    if ($DeferCmdRemoval) {
        # CMD still reads its batch file after PowerShell returns. Remove it afterwards.
        $quotedRoot = "'" + $Root.Replace("'", "''") + "'"
        $cleanup = @"
Start-Sleep -Seconds 2
`$root = $quotedRoot
if (Test-Path -LiteralPath (Join-Path `$root 'izify-install.json')) { return }
if ((Test-Path -LiteralPath `$root) -and -not ((Get-Item -LiteralPath `$root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    `$cmd = Join-Path `$root 'izify.cmd'
    if (Test-Path -LiteralPath `$cmd -PathType Leaf) { Remove-Item -LiteralPath `$cmd -Force }
    if (-not @(Get-ChildItem -LiteralPath `$root -Force).Count) { Remove-Item -LiteralPath `$root -Force }
}
"@
        $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cleanup))
        Start-Process -FilePath (Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe') -ArgumentList '-NoProfile','-WindowStyle','Hidden','-EncodedCommand',$encoded -WorkingDirectory ([IO.Path]::GetDirectoryName($Root)) -WindowStyle Hidden
    }
}
