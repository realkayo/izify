[CmdletBinding()]
param(
    [string]$SourceRoot,
    [string]$Destination = (Join-Path $env:LOCALAPPDATA 'Izify'),
    [switch]$NoPath,
    [switch]$NoAutoStart,
    [switch]$NoPauseOnError,
    [switch]$Launch
)
Clear-Host
try {
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false) } catch {}
$script:IzifyInstallerAnsi = $false
try {
    if (-not ('IzifyInstallConsole' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IzifyInstallConsole {
    [DllImport("kernel32.dll")] public static extern IntPtr GetStdHandle(int handle);
    [DllImport("kernel32.dll")] public static extern bool GetConsoleMode(IntPtr handle, out uint mode);
    [DllImport("kernel32.dll")] public static extern bool SetConsoleMode(IntPtr handle, uint mode);
}
'@
    }
    $consoleHandle = [IzifyInstallConsole]::GetStdHandle(-11)
    [uint32]$consoleMode = 0
    if ([IzifyInstallConsole]::GetConsoleMode($consoleHandle, [ref]$consoleMode)) {
        $script:IzifyInstallerAnsi = [IzifyInstallConsole]::SetConsoleMode($consoleHandle, ($consoleMode -bor 4))
    }
} catch {}
function Write-IzifyInstall {
    param([string]$Message, [string]$Level = 'INFO', [switch]$Logo)
    $line = if ($Level) { '[' + $Level + '] ' + $Message } else { $Message }
    if ($Logo -and $script:IzifyInstallerAnsi) {
        $escape = [char]27
        Write-Host ("${escape}[38;2;255;168;209m" + $line + "${escape}[0m")
    } elseif ($Logo) { Write-Host $line -ForegroundColor Magenta }
    elseif ($Level -eq 'ERRO') { Write-Host $line -ForegroundColor Red }
    else { Write-Host $line }
}
Write-IzifyInstall 'Preparando a instalacao...'
if (-not $SourceRoot) { $SourceRoot = $PSScriptRoot }
$files = @('run.ps1','launch.ps1','uninstall.ps1','build.ps1','tools/uninstall.ps1','tools/bundle.ps1','tools/cdp.ps1','tools/auto-start.ps1','tools/launcher.cs',
    'izify-ui.js','src/ui.css','src/panel-extras.js','src/core/logs.js','src/core/storage.js','src/core/assets.js','src/core/performance.js','tools/benchmark.ps1',
    'src/core/plugins.js','src/core/themes.js','src/core/gaara.js','src/core/lyrics.js','src/core/personalization.js','src/core/download-bridge.js','assets/logo.txt','assets/icons/download.svg','assets/icons/LICENSE',
    'assets/themes/kuromi/head.png','assets/themes/kuromi/wallpaper.png','assets/themes/kuromi/liked-songs.png',
    'assets/themes/gaara/head.png','assets/themes/gaara/wallpaper.jpg','assets/themes/gaara/seal.svg','assets/themes/gaara/gourd.svg','assets/themes/gaara/liked-songs.svg',
    'plugins/ad-block.js','plugins/download.js','plugins/example.js','tools/download-bridge.ps1','tools/download-worker.ps1','probe.js')
$local = $SourceRoot -and (Test-Path -LiteralPath (Join-Path $SourceRoot 'run.ps1') -PathType Leaf)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$Destination = [System.IO.Path]::GetFullPath($Destination)
$manifest = @{}
if ($local) {
    foreach ($file in $files) {
        if ($file -match '\.(png|jpg)$') { $manifest[$file] = [IO.File]::ReadAllBytes((Join-Path $SourceRoot $file)) }
        else { $manifest[$file] = [System.IO.File]::ReadAllText((Join-Path $SourceRoot $file), $utf8) }
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
            if ($file -match '\.(png|jpg)$') {
                $copy = New-Object IO.MemoryStream
                try { $stream.CopyTo($copy); $manifest[$file] = $copy.ToArray() } finally { $copy.Dispose(); $stream.Dispose() }
            } else {
                $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
                try { $manifest[$file] = $reader.ReadToEnd() } finally { $reader.Dispose() }
            }
        }
    } catch { Write-IzifyInstall ('Falha no download: ' + $_.Exception.Message) 'ERRO'; throw ('Publish the Izify scripts to realkayo/izify (main) first. Download failed: ' + $_.Exception.Message) }
}
Write-IzifyInstall ($manifest['assets/logo.txt'].TrimEnd()) '' -Logo
# Validate support before writing the installation, editing PATH/shortcuts or stopping apps.
if (-not $NoAutoStart) {
    . ([scriptblock]::Create($manifest['tools/auto-start.ps1']))
    $installation = Get-IzifySpotifyInstallation
    Write-IzifyInstall ($installation.Label + $(if ($installation.Version) { ' - ' + $installation.Version } else { '' })) 'DETECTADO'
    $installation = Assert-IzifySpotifyDesktop -SpotifyPath $installation.Path
    $spotifyExe = $installation.Path
}
Write-IzifyInstall 'Instalando os arquivos...'
foreach ($file in $files) {
    $target = [System.IO.Path]::GetFullPath((Join-Path $Destination $file))
    if (-not $target.StartsWith($Destination + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid package path.' }
    [void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target))
    if ($file -match '\.(png|jpg)$') { [IO.File]::WriteAllBytes($target, $manifest[$file]) }
    else { [System.IO.File]::WriteAllText($target, $manifest[$file], $utf8) }
}
$shim = '@if /I "%~1"=="uninstall" (powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %* & exit /b)' + "`r`n" +
    '@powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*' + "`r`n" +
    '@set "IZIFY_EXIT_CODE=%ERRORLEVEL%"' + "`r`n" + '@if not "%IZIFY_EXIT_CODE%"=="0" pause' + "`r`n" + '@exit /b %IZIFY_EXIT_CODE%' + "`r`n"
[System.IO.File]::WriteAllText((Join-Path $Destination 'izify.cmd'), $shim, [System.Text.Encoding]::ASCII)
$ownedFiles = @($files) + @('izify.cmd','Izify.Launcher.exe','spotify-shortcuts.json','auto-start.log','auto-start-status.json','dist/izify.bundle.js','izify-install.json')
$receipt = @{product='Izify'; version=1; root=$Destination; files=$ownedFiles}
[IO.File]::WriteAllText((Join-Path $Destination 'izify-install.json'), ($receipt | ConvertTo-Json -Depth 5), $utf8)
if (-not $NoPath) {
    $current = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = @($current -split ';' | Where-Object { $_ })
    if (-not ($entries | Where-Object { $_.TrimEnd('\') -ieq $Destination.TrimEnd('\') })) {
        [Environment]::SetEnvironmentVariable('Path', (($entries + $Destination) -join ';'), 'User')
    }
    if (-not (($env:Path -split ';') | Where-Object { $_.TrimEnd('\') -ieq $Destination.TrimEnd('\') })) { $env:Path += ';' + $Destination }
}
if (-not $NoAutoStart) {
    # The public `irm ... | iex` command works with Restricted execution policy.
    # Import the already-downloaded helper as code, without changing system policy.
    $integrationCode = [IO.File]::ReadAllText((Join-Path $Destination 'tools/auto-start.ps1'), $utf8)
    . ([scriptblock]::Create($integrationCode))
    Write-IzifyInstall 'Criando o launcher e configurando a abertura automatica...'
    Stop-IzifyMonitor -Root $Destination
    Build-IzifyLauncher -Root $Destination
    Set-IzifySpotifyShortcuts -Root $Destination
    New-IzifySpotifyShortcuts -Root $Destination -SpotifyPath $spotifyExe
    Install-IzifyAutoStart -Root $Destination
    Write-IzifyInstall 'Reiniciando o Spotify Desktop para carregar o Izify...'
    Restart-IzifySpotifyDesktop -SpotifyPath $spotifyExe
}
Write-IzifyInstall ("Izify instalado em " + $Destination) 'OK'
if ($NoAutoStart) { Write-IzifyInstall 'Modo manual: izify -Watch.' }
else {
    Write-IzifyInstall 'Abertura automatica configurada nesta sessao e no login do Windows.' 'OK'
    Write-IzifyInstall 'Spotify Desktop iniciado com depuracao. O monitor carrega o Izify automaticamente.' 'OK'
    Write-IzifyInstall 'Instalacao concluida. Nas proximas vezes, basta abrir o Spotify pelo atalho criado.' 'OK'
}
Write-IzifyInstall 'Para desinstalar: izify uninstall.'
if ($Launch -and $NoAutoStart) { throw '-Launch exige a instalacao automatica do Izify.' }
} catch {
    $installFailure = $_
    Write-IzifyInstall $installFailure.Exception.Message 'ERRO'
    if (-not $NoPauseOnError) {
        try { [void](Read-Host 'A instalacao falhou. A janela permanecera aberta ate voce pressionar Enter') } catch {}
    }
    throw $installFailure
}
