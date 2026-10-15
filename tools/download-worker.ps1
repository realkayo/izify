[CmdletBinding()]
param([ValidateSet('status','setup','search','inspect','download')][string]$Operation, $Data)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$tools = Join-Path $env:LOCALAPPDATA 'Izify/download-tools'
$defaultFolder = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads/Izify'
function Find-Tool([string]$Name) {
    $local = Join-Path $tools ($Name + '.exe')
    if (Test-Path -LiteralPath $local) { return $local }
    $command = Get-Command ($Name + '.exe') -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
}
function Get-ToolsStatus {
    @{ ready = [bool]((Find-Tool 'yt-dlp') -and (Find-Tool 'qjs')); folder = $defaultFolder; engine = 'native' }
}
function Save-ReleaseAsset([string]$Repository, [string]$Name, [string]$Destination) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $release = Invoke-RestMethod ("https://api.github.com/repos/$Repository/releases/latest") -Headers @{ 'User-Agent' = 'Izify' } -TimeoutSec 15
    $asset = $release.assets | Where-Object name -eq $Name | Select-Object -First 1
    if (-not $asset -or $asset.browser_download_url -notlike 'https://github.com/*') { throw "Arquivo oficial indisponivel: $Name" }
    Invoke-WebRequest $asset.browser_download_url -UseBasicParsing -OutFile $Destination -TimeoutSec 120
    if ($asset.digest -match '^sha256:([a-f0-9]{64})$') {
        if ((Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -ine $Matches[1]) { throw "Checksum invalido: $Name" }
    }
}
function Assert-VideoUrl([string]$Value) {
    $uri = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne 'https' -or
        $uri.Host -notin @('youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be') -or $uri.UserInfo) {
        throw 'Cole um link HTTPS de um video do YouTube.'
    }
    if ($uri.Host -ne 'youtu.be' -and $uri.AbsolutePath -notmatch '^/(watch|shorts/|live/)') { throw 'Escolha um video individual.' }
    return $uri.AbsoluteUri
}
# Windows argv quoting, never a shell command. Handles embedded quotes/backslashes.
function Quote-Argument([string]$Value) {
    '"' + [regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
}
function Invoke-Downloader([string[]]$Arguments, [int]$Timeout = 30) {
    $exe = Find-Tool 'yt-dlp'
    if (-not $exe) { throw 'Prepare as ferramentas primeiro.' }
    $baseArgs = @('--ignore-config','--no-playlist','--no-warnings','--encoding','utf-8','--socket-timeout','8','--retries','0','--extractor-retries','0','--no-js-runtimes')
    $qjs = Find-Tool 'qjs'
    if ($qjs) { $baseArgs += @('--js-runtimes', ('quickjs:' + $qjs)) }
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $exe
    $info.Arguments = (($baseArgs + $Arguments) | ForEach-Object { Quote-Argument $_ }) -join ' '
    $info.UseShellExecute = $false; $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = New-Object Text.UTF8Encoding($false)
    $info.StandardErrorEncoding = New-Object Text.UTF8Encoding($false)
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
        $clock = [Diagnostics.Stopwatch]::StartNew()
        while (-not $process.WaitForExit(200)) {
            if ($clock.Elapsed.TotalSeconds -ge $Timeout) { throw 'A fonte demorou demais para responder. Tente outro link ou novamente mais tarde.' }
        }
        $output = $stdout.GetAwaiter().GetResult(); $errorText = $stderr.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw ($errorText.Trim() | Select-Object -First 1) }
        return $output
    } finally {
        try {
            if (-not $process.HasExited) {
                $killInfo = New-Object Diagnostics.ProcessStartInfo
                $killInfo.FileName = Join-Path $env:SystemRoot 'System32/taskkill.exe'
                $killInfo.Arguments = '/PID ' + $process.Id + ' /T /F'
                $killInfo.UseShellExecute = $false; $killInfo.CreateNoWindow = $true
                $killInfo.RedirectStandardOutput = $true; $killInfo.RedirectStandardError = $true
                $killer = [Diagnostics.Process]::Start($killInfo)
                [void]$killer.WaitForExit(2000); $killer.Dispose()
                if (-not $process.HasExited) { $process.Kill() }
            }
        } catch {}
        $process.Dispose()
    }
}
try {
    $result = switch ($Operation) {
        'status' { Get-ToolsStatus }
        'setup' {
            [void][IO.Directory]::CreateDirectory($tools)
            $stage = Join-Path $tools ([Guid]::NewGuid().ToString('N'))
            [void][IO.Directory]::CreateDirectory($stage)
            try {
                if (-not (Find-Tool 'yt-dlp')) { Save-ReleaseAsset 'yt-dlp/yt-dlp' 'yt-dlp.exe' (Join-Path $stage 'yt-dlp.exe') }
                Save-ReleaseAsset 'quickjs-ng/quickjs' 'qjs-windows-x86_64.exe' (Join-Path $stage 'qjs.exe')
                foreach ($name in @('yt-dlp','qjs')) {
                    if ($name -eq 'yt-dlp' -and (Find-Tool 'yt-dlp')) { continue }
                    $binary = Get-ChildItem -LiteralPath $stage -Filter ($name + '.exe') -Recurse | Select-Object -First 1
                    if (-not $binary) { throw "Ferramenta nao encontrada: $name" }
                    Copy-Item -LiteralPath $binary.FullName -Destination (Join-Path $tools ($name + '.exe')) -Force
                }
                # Retire only the known binaries installed by the previous downloader.
                foreach ($name in @('ffmpeg.exe','ffprobe.exe','deno.exe')) {
                    $obsolete = Join-Path $tools $name
                    if (Test-Path -LiteralPath $obsolete -PathType Leaf) { Remove-Item -LiteralPath $obsolete -Force }
                }
            } finally {
                # Stage is a GUID directory constructed immediately under download-tools.
                $resolved = [IO.Path]::GetFullPath($stage)
                if ($resolved.StartsWith([IO.Path]::GetFullPath($tools) + [IO.Path]::DirectorySeparatorChar)) { Remove-Item -LiteralPath $resolved -Recurse -Force }
            }
            Get-ToolsStatus
        }
        'search' {
            $query = [string]$Data.query
            if (-not $query.Trim() -or $query.Length -gt 300) { throw 'Informe o nome da musica e artista.' }
            $json = Invoke-Downloader @('--flat-playlist','--dump-single-json','--skip-download','--',('ytsearch3:' + $query)) 15
            $metadata = $json | ConvertFrom-Json
            @{ entries = @($metadata.entries | Where-Object { $_.id -match '^[a-zA-Z0-9_-]{11}$' } | ForEach-Object {
                @{ title = $_.title; artist = $_.channel; duration = $_.duration; url = ('https://www.youtube.com/watch?v=' + $_.id) }
            }) }
        }
        'inspect' {
            $url = Assert-VideoUrl $Data.url
            $metadata = (Invoke-Downloader @('--dump-single-json','--skip-download','--',$url)) | ConvertFrom-Json
            if ($metadata.is_live) { throw 'Transmissoes ao vivo nao sao suportadas.' }
            $audio = @($metadata.formats | Where-Object { $_.acodec -and $_.acodec -ne 'none' -and $_.vcodec -eq 'none' })
            @{ title = $metadata.title; artist = $metadata.uploader; url = $url;
               audioFormats = @(@('m4a','webm') | Where-Object { $audio.ext -contains $_ });
               video = [bool]@($metadata.formats | Where-Object { $_.ext -eq 'mp4' -and $_.vcodec -and $_.vcodec -ne 'none' -and $_.acodec -and $_.acodec -ne 'none' }).Count }
        }
        'download' {
            $url = Assert-VideoUrl $Data.url
            $format = [string]$Data.format
            if ($format -notin @('m4a','webm','mp4')) { throw 'Escolha M4A, WebM ou MP4 original. A versao leve nao converte para MP3.' }
            $folder = [string]$Data.folder
            if (-not $folder) { $folder = $defaultFolder }
            if (-not [IO.Path]::IsPathRooted($folder) -or $folder.StartsWith('\\')) { throw 'Informe uma pasta local com caminho completo.' }
            $folder = [IO.Path]::GetFullPath($folder)
            [void][IO.Directory]::CreateDirectory($folder)
            $arguments = @('--no-progress','--fixup','never','--windows-filenames','--no-overwrites','--print','after_move:filepath',
                '-o',(Join-Path $folder '%(title).150B [%(id)s].%(ext)s'))
            if ($format -eq 'mp4') {
                $arguments += @('-f','b[ext=mp4]')
            } else {
                $arguments += @('-f',('ba[ext=' + $format + ']'))
            }
            $output = Invoke-Downloader ($arguments + @('--',$url)) 600
            $file = ($output.Trim() -split "`r?`n")[-1]
            if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'O downloader nao confirmou o arquivo final.' }
            @{ file = $file }
        }
    }
    @{ ok = $true; data = $result }
} catch { @{ ok = $false; error = $_.Exception.Message } }
