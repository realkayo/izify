[CmdletBinding()]
param([string]$ProjectDirectory)
$ErrorActionPreference='Stop'
if(-not $ProjectDirectory){$ProjectDirectory=Split-Path $PSScriptRoot -Parent}
$utf8=New-Object Text.UTF8Encoding($false)
function Assert-Release($Condition,[string]$Message){if(-not $Condition){throw $Message}}
$fixture=Join-Path $ProjectDirectory ('.test-artifacts/release test '+[Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($fixture)
$tokens=$null;$errors=$null
$tree=[Management.Automation.Language.Parser]::ParseFile((Join-Path $ProjectDirectory 'install.ps1'),[ref]$tokens,[ref]$errors)
$assignment=$tree.Find({param($node) $node -is [Management.Automation.Language.AssignmentStatementAst] -and $node.Left -is [Management.Automation.Language.VariableExpressionAst] -and $node.Left.VariablePath.UserPath -eq 'files'},$true)
$runtime=@($assignment.Right.Expression.SafeGetValue())
$extra=@('install.ps1','instalar.bat','preparar-github.bat','tools/prepare-release.ps1','docs/README-release.md','docs/release.gitignore',
 'tests/auto-start.ps1','tests/download.ps1','tests/fixture.html','tests/gaara-preview.js','tests/gaara.js',
 'tests/headless.ps1','tests/installer-fixture.ps1','tests/installer.ps1','tests/smoke.ps1','tests/uninstall.ps1','tests/release.ps1')
foreach($name in @($runtime+$extra)){
    $target=Join-Path $fixture $name;[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))
    Copy-Item -LiteralPath (Join-Path $ProjectDirectory $name) -Destination $target
}
$secret='IZIFY_PRIVATE_SENTINEL_'+[Guid]::NewGuid().ToString('N')+'_MUST_NOT_SHIP'
foreach($name in @('.env','spotify-shortcuts.json','auto-start.log','izify-install.json','Izify.Launcher.exe','src/local-config.json','assets/private-image.txt','dist/izify.bundle.js','.git/config')){
    $path=Join-Path $fixture $name;[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path));[IO.File]::WriteAllText($path,$secret,$utf8)
}
$first=& (Join-Path $fixture 'tools/prepare-release.ps1') -ProjectRoot $fixture
$second=& (Join-Path $fixture 'tools/prepare-release.ps1') -ProjectRoot $fixture
Assert-Release ($first.github -ne $second.github -and (Test-Path -LiteralPath $first.github)) 'Repeated clean builds must preserve earlier output.'
Assert-Release ([IO.File]::ReadAllText((Join-Path $fixture 'spotify-shortcuts.json')) -eq $secret) 'Packaging must preserve local preferences/backups.'
Assert-Release ([IO.File]::ReadAllText((Join-Path $fixture 'dist/izify.bundle.js')) -eq $secret) 'Packaging must not overwrite the source build.'
$manifest=Get-Content -LiteralPath (Join-Path $first.github 'release-manifest.json') -Raw -Encoding UTF8|ConvertFrom-Json
foreach($entry in $manifest.files){
    $path=Join-Path $first.github $entry.path
    Assert-Release ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -eq $entry.sha256) ('Manifest mismatch: '+$entry.path)
}
foreach($name in @('.env','spotify-shortcuts.json','auto-start.log','izify-install.json','Izify.Launcher.exe','src/local-config.json','assets/private-image.txt','.git/config')){
    Assert-Release (-not (Test-Path -LiteralPath (Join-Path $first.github $name))) ('Private file shipped: '+$name)
}
foreach($file in Get-ChildItem -LiteralPath $first.github -Recurse -File -Force){
    Assert-Release (-not [IO.File]::ReadAllText($file.FullName).Contains($secret)) ('Private sentinel shipped: '+$file.Name)
}
foreach($name in @('instalar.bat','install.ps1','dist/izify.bundle.js','src/core/gaara.js','assets/themes/gaara/seal.svg')){
    Assert-Release (Test-Path -LiteralPath (Join-Path $first.github $name) -PathType Leaf) ('Release missing: '+$name)
}
. (Join-Path $first.github 'tools/bundle.ps1')
Assert-Release ([IO.File]::ReadAllText((Join-Path $first.github 'dist/izify.bundle.js'),$utf8) -eq (Get-IzifyBundle -Root $first.github)) 'Shipped bundle must match only the staged sources.'
$ignore=[IO.File]::ReadAllText((Join-Path $first.github '.gitignore'))
Assert-Release ($ignore.Contains('!dist/izify.bundle.js') -and $ignore.Contains('spotify-shortcuts.json')) 'Release ignore rules must permit bundle and exclude local state.'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Compression.ZipFile]::OpenRead($first.zip)
try{Assert-Release (@($archive.Entries|Where-Object {$_.FullName -eq 'instalar.bat'}).Count -eq 1) 'ZIP must contain the installer at its root.'}finally{$archive.Dispose()}
$extracted=Join-Path $fixture 'extraido outro PC'
[IO.Compression.ZipFile]::ExtractToDirectory($first.zip,$extracted)
$installed=Join-Path $fixture 'instalado sem preferencias'
$oldPause=$env:IZIFY_NO_PAUSE
try{$env:IZIFY_NO_PAUSE='1';& (Join-Path $extracted 'instalar.bat') -Destination $installed -NoAutoStart -NoPath}
finally{if($null -eq $oldPause){Remove-Item Env:IZIFY_NO_PAUSE -ErrorAction SilentlyContinue}else{$env:IZIFY_NO_PAUSE=$oldPause}}
Assert-Release ($LASTEXITCODE -eq 0) 'Extracted package must install with no access to original project files.'
foreach($name in $runtime){Assert-Release ((Get-FileHash -LiteralPath (Join-Path $installed $name)).Hash -eq (Get-FileHash -LiteralPath (Join-Path $extracted $name)).Hash) ('Installed package mismatch: '+$name)}
Assert-Release (-not (Test-Path -LiteralPath (Join-Path $installed 'spotify-shortcuts.json'))) 'Publisher shortcut backups must not reach another installation.'
# A real absolute profile path in an approved source must stop publication.
$privatePath=([string][char]67)+':\'+('Us'+'ers')+'\private-user\settings.json'
[IO.File]::AppendAllText((Join-Path $fixture 'plugins/example.js'),("`n// "+$privatePath),$utf8)
$blocked=$false
try{& (Join-Path $fixture 'tools/prepare-release.ps1') -ProjectRoot $fixture|Out-Null}catch{$blocked=$_.Exception.Message -match 'Personal Windows profile path'}
Assert-Release $blocked 'Packaging must reject a personal profile path in an approved source.'
$example=Join-Path $fixture 'plugins/example.js'
[IO.File]::WriteAllText($example,([IO.File]::ReadAllText((Join-Path $ProjectDirectory 'plugins/example.js'),$utf8)+"`n// "+$privatePath.Replace('\','\\')),$utf8)
$blocked=$false
try{& (Join-Path $fixture 'tools/prepare-release.ps1') -ProjectRoot $fixture|Out-Null}catch{$blocked=$_.Exception.Message -match 'Personal Windows profile path'}
Assert-Release $blocked 'Packaging must also reject escaped JavaScript/JSON profile paths.'
Assert-Release (@(Get-ChildItem -LiteralPath (Join-Path $fixture 'release') -Directory|Where-Object {Test-Path -LiteralPath (Join-Path $_.FullName 'github')}).Count -eq 2) 'Failed builds must not expose a ready-to-publish github folder.'
Write-Host 'PASS: allowlist, no personal data, preserved workspace, fresh bundles, manifests, portable ZIP, isolated install, path leak rejection.'
