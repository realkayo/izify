# Bundler for Windows PowerShell 5.1; no external tools.
function Get-IzifyBundleFiles {
    param([Parameter(Mandatory)][string]$Root)
    @('src/core/logs.js', 'src/core/storage.js', 'src/core/plugins.js', 'src/panel-extras.js',
      'src/ui.css', 'assets/logo.txt', 'izify-ui.js', 'plugins/ad-block.js', 'probe.js') |
        ForEach-Object { Join-Path $Root $_ }
}

function Get-IzifyBundle {
    param([Parameter(Mandatory)][string]$Root)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $read = { param($Name) [System.IO.File]::ReadAllText((Join-Path $Root $Name), $utf8) }
    $assets = @{
        css = & $read 'src/ui.css'
        logo = & $read 'assets/logo.txt'
        probe = & $read 'probe.js'
        builtins = @(@{ id = 'ad-block'; source = & $read 'plugins/ad-block.js' })
    } | ConvertTo-Json -Depth 8 -Compress
    $core = @('src/core/logs.js','src/core/storage.js','src/core/plugins.js','src/panel-extras.js') |
        ForEach-Object { & $read $_ }
    $entry = & $read 'izify-ui.js'
    @"
(async () => {
if (window.__izify?.destroy) await window.__izify.destroy();
window.__izifyModules = {};
window.__izifyAssets = $assets;
$($core -join "`n")
$entry
await window.izify.ready;
window.__spotifyJsRunner = true;
return 'Izify 2.2.0 pronto';
})()
"@
}
