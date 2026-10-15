[CmdletBinding()]
param([string]$ProjectRoot)
$ErrorActionPreference='Stop'
if(-not $ProjectRoot){$ProjectRoot=Split-Path $PSScriptRoot -Parent}
$root=[IO.Path]::GetFullPath($ProjectRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)
$utf8=New-Object Text.UTF8Encoding($false)

function Get-ReleaseSource([string]$Relative){
    if([IO.Path]::IsPathRooted($Relative) -or $Relative -match '(^|[\\/])\.\.([\\/]|$)'){throw "Invalid package path: $Relative"}
    $path=[IO.Path]::GetFullPath((Join-Path $root $Relative))
    if(-not $path.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Package path escaped project.'}
    # Never follow a link from an approved filename into a private directory.
    $check=$root
    foreach($part in ($Relative -split '[\\/]')){
        $check=Join-Path $check $part
        $item=Get-Item -LiteralPath $check -Force -ErrorAction Stop
        if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Linked package path is not allowed: $Relative"}
    }
    if(-not (Test-Path -LiteralPath $path -PathType Leaf)){throw "Missing package file: $Relative"}
    return $path
}

# Read the installer's literal file list without executing the installer.
$tokens=$null;$parseErrors=$null
$tree=[Management.Automation.Language.Parser]::ParseFile((Get-ReleaseSource 'install.ps1'),[ref]$tokens,[ref]$parseErrors)
if($parseErrors.Count){throw 'Installer has PowerShell syntax errors.'}
$assignments=@($tree.FindAll({param($node) $node -is [Management.Automation.Language.AssignmentStatementAst] -and $node.Left -is [Management.Automation.Language.VariableExpressionAst] -and $node.Left.VariablePath.UserPath -eq 'files'},$true))
if($assignments.Count -ne 1){throw 'Expected one literal installer package list.'}
if($assignments[0].Right -isnot [Management.Automation.Language.CommandExpressionAst]){throw 'Installer package must be a literal array.'}
$runtime=@($assignments[0].Right.Expression.SafeGetValue())
if(-not $runtime.Count -or @($runtime|Where-Object {$_ -isnot [string]}).Count){throw 'Invalid installer package list.'}
$extras=@('install.ps1','instalar.bat','preparar-github.bat','tools/prepare-release.ps1','docs/README-release.md','docs/release.gitignore',
 'tests/auto-start.ps1','tests/download.ps1','tests/fixture.html','tests/gaara-preview.js','tests/gaara.js',
 'tests/headless.ps1','tests/installer-fixture.ps1','tests/installer.ps1','tests/smoke.ps1','tests/uninstall.ps1','tests/release.ps1')
$files=@(($runtime+$extras)|Sort-Object -Unique)
foreach($name in $files){[void](Get-ReleaseSource $name)}

# Always create a new directory. No recursive deletion and no access to AppData.
$output=Join-Path $root 'release'
if(Test-Path -LiteralPath $output){if((Get-Item -LiteralPath $output -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Release directory must not be a link.'}}
[void][IO.Directory]::CreateDirectory($output)
$id='izify-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,6)
$folder=Join-Path $output $id
$stage=Join-Path $folder '.staging'
[void][IO.Directory]::CreateDirectory($stage)
foreach($name in $files){
    $target=Join-Path $stage $name
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))
    Copy-Item -LiteralPath (Get-ReleaseSource $name) -Destination $target
}
Copy-Item -LiteralPath (Get-ReleaseSource 'docs/README-release.md') -Destination (Join-Path $stage 'README.md')
Copy-Item -LiteralPath (Get-ReleaseSource 'docs/release.gitignore') -Destination (Join-Path $stage '.gitignore')

# Build from the staged sources; never copy a previous bundle or installed app.
. (Get-ReleaseSource 'tools/bundle.ps1')
$bundle=Get-IzifyBundle -Root $stage
$dist=Join-Path $stage 'dist'
[void][IO.Directory]::CreateDirectory($dist)
[IO.File]::WriteAllText((Join-Path $dist 'izify.bundle.js'),$bundle,$utf8)

$allowed=@($files+@('README.md','.gitignore','dist/izify.bundle.js'))
$entries=@()
foreach($file in Get-ChildItem -LiteralPath $stage -Recurse -File -Force){
    $relative=$file.FullName.Substring($stage.Length+1).Replace('\','/')
    if($relative -notin $allowed){throw "Unexpected file in release: $relative"}
    if($file.Extension -in @('.js','.ps1','.bat','.md','.gitignore','.html','.cs','.svg') -or $file.Name -eq '.gitignore'){
        $content=[IO.File]::ReadAllText($file.FullName,$utf8)
        if($content -match '(?i)\b[a-z]:[\\/]+Users[\\/]+[^\\/\s"''<>]+'){
            throw "Personal Windows profile path found in $relative. Remove it from source before publishing."
        }
    }
    $entries+= [pscustomobject]@{path=$relative;bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
}
$manifest=[ordered]@{product='Izify';format=1;files=@($entries|Sort-Object path)}
[IO.File]::WriteAllText((Join-Path $stage 'release-manifest.json'),($manifest|ConvertTo-Json -Depth 5),$utf8)
$ready=Join-Path $folder 'github'
foreach($path in @($stage,$ready)){
    $resolved=[IO.Path]::GetFullPath($path)
    if(-not $resolved.StartsWith([IO.Path]::GetFullPath($folder)+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Release staging escaped output directory.'}
}
[IO.Directory]::Move($stage,$ready)
$stage=$ready
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=Join-Path $folder ($id+'.zip')
[IO.Compression.ZipFile]::CreateFromDirectory($stage,$zip,[IO.Compression.CompressionLevel]::Optimal,$false)
Write-Host '[OK] Pacote limpo criado. Preferencias locais preservadas.'
Write-Host ('GitHub: '+$stage)
Write-Host ('ZIP para enviar: '+$zip)
[pscustomobject]@{folder=$folder;github=$stage;zip=$zip;files=$entries.Count+1}
