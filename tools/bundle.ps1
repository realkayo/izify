# Bundler for Windows PowerShell 5.1; no external tools.
function Get-IzifyBundleFiles {
    param([Parameter(Mandatory)][string]$Root)
    @('src/core/assets.js','src/core/performance.js','src/core/logs.js', 'src/core/storage.js', 'src/core/plugins.js', 'src/core/themes.js','src/core/gaara.js', 'src/core/lyrics.js', 'src/core/personalization.js', 'src/core/download-bridge.js', 'src/panel-extras.js',
      'src/ui.css', 'assets/logo.txt', 'izify-ui.js', 'plugins/ad-block.js', 'plugins/download.js', 'probe.js',
      'tools/download-bridge.ps1', 'tools/download-worker.ps1', 'assets/themes/kuromi/head.png', 'assets/themes/kuromi/wallpaper.png', 'assets/themes/kuromi/liked-songs.png', 'assets/themes/gaara/head.png', 'assets/themes/gaara/wallpaper.jpg','assets/themes/gaara/seal.svg','assets/themes/gaara/gourd.svg','assets/themes/gaara/liked-songs.svg') |
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
        images = @{
            kuromiHead = 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Root 'assets/themes/kuromi/head.png')))
            kuromiWallpaper = 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Root 'assets/themes/kuromi/wallpaper.png')))
            kuromiLikedSongs = 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Root 'assets/themes/kuromi/liked-songs.png')))
            gaaraHead = 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Root 'assets/themes/gaara/head.png')))
            gaaraWallpaper = 'data:image/jpeg;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Root 'assets/themes/gaara/wallpaper.jpg')))
            gaaraSeal = 'data:image/svg+xml;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Root 'assets/themes/gaara/seal.svg')))
            gaaraGourd = 'data:image/svg+xml;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Root 'assets/themes/gaara/gourd.svg')))
            gaaraLikedSongs = 'data:image/svg+xml;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $Root 'assets/themes/gaara/liked-songs.svg')))
        }
        builtins = @(@{ id = 'ad-block'; source = & $read 'plugins/ad-block.js' }, @{ id = 'download'; source = & $read 'plugins/download.js' })
    } | ConvertTo-Json -Depth 8 -Compress
    $core = @('src/core/assets.js','src/core/logs.js','src/core/storage.js','src/core/performance.js','src/core/plugins.js','src/core/themes.js','src/core/gaara.js','src/core/lyrics.js','src/core/personalization.js','src/core/download-bridge.js','src/panel-extras.js') |
        ForEach-Object { & $read $_ }
    $entry = & $read 'izify-ui.js'
    @"
(async () => {
if (!document.documentElement || !document.body) {
  await new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (document.documentElement && document.body) return resolve();
      if (Date.now() - started > 25000) return reject(new Error('Spotify document not ready'));
      setTimeout(check, 100);
    };
    check();
  });
}
if (window.__izify?.destroy) await window.__izify.destroy();
window.__izifyModules = {};
window.__izifyAssets = $assets;
$($core -join "`n")
$entry
await window.izify.ready;
window.__spotifyJsRunner = true;
return 'Izify 2.4.0 pronto';
})()
"@
}
