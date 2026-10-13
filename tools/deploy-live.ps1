$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'bundle.ps1')
. (Join-Path $PSScriptRoot 'cdp.ps1')
$targets = Invoke-RestMethod 'http://127.0.0.1:9222/json/list' -TimeoutSec 3
$target = $targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'https://xpui.app.spotify.com/*' } | Select-Object -First 1
if (-not $target) { throw 'Spotify XPUI unavailable.' }
# Roll back the single-slot experiment before the plugin captures its baseline.
$restore = @'
(async()=>{
  const c=window.__izifyInspection;
  await window.izify?.plugins.enable('ad-block',false);
  const before=c?.blockSnapshot?.slotSettings?.slotSettings?.[0];
  if(before&&c.settingsClient)await c.settingsClient.updateSlotEnabled({slotId:before.id,enabled:before.enabled});
  if(c?.ProductStateAPI?.productStateApi)await c.ProductStateAPI.productStateApi.delOverridesValues({keys:['ads']});
  return true;
})()
'@
Invoke-IzifyExpression $target.webSocketDebuggerUrl $restore | Out-Null
Invoke-IzifyExpression $target.webSocketDebuggerUrl (Get-IzifyBundle -Root $root) | Write-Host
Invoke-IzifyExpression $target.webSocketDebuggerUrl "(async()=>{await izify.plugins.enable('ad-block',true);await izifyAds.ready;return izifyAds.status();})()" | ConvertTo-Json -Depth 8 | Write-Host
