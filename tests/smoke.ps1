param([Parameter(Mandatory)][int]$Port)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $root 'tools/cdp.ps1')
. (Join-Path $root 'tools/bundle.ps1')
$targets = Invoke-RestMethod "http://127.0.0.1:$Port/json/list"
$target = $targets |
    Where-Object { $_.type -eq 'page' -and $_.url -like 'http://127.0.0.1:*' } | Select-Object -First 1
if (-not $target) { throw ('Use a dedicated local fixture page, not Spotify. Targets: ' + ($targets | ConvertTo-Json -Compress)) }
$endpoint = $target.webSocketDebuggerUrl
$session = Open-IzifyCdp $endpoint
function Eval-Test([string]$Expression) { Invoke-IzifyExpression -WebSocketUrl $endpoint -Expression $Expression -Connection $session }
try {
Eval-Test '(async()=>{if(window.__izify)await window.__izify.destroy();localStorage.clear();await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase("izify");r.onsuccess=resolve;r.onerror=reject;});})()' | Out-Null
Write-Host (Eval-Test (Get-IzifyBundle -Root $root))
Start-Sleep -Milliseconds 300
function Save-Shot([string]$Name) {
    Start-Sleep -Milliseconds 200
    $shot = Invoke-IzifyCdp $endpoint 'Page.captureScreenshot' @{ format='png' } -Connection $session
    $dest = Join-Path $root ".test-artifacts/compact/$Name.png"
    [IO.File]::WriteAllBytes($dest, [Convert]::FromBase64String($shot.data))
}
Save-Shot 'welcome'
$checks = @'
(async()=>{
  const assert=(v,m)=>{if(!v)throw new Error(m)},wait=()=>new Promise(r=>setTimeout(r,170));
  window.testTicks=0;window.testEvents=0;
  const ui=document.querySelector('#izify-host').shadowRoot;
  assert(getComputedStyle(ui.querySelector('.modal .primary')).backgroundColor==='rgb(167, 139, 250)','welcome uses purple independently of Spotify theme');
  ui.querySelector('#ok').click();izify.open();await wait();
  const panel=ui.querySelector('.panel'),rect=panel.getBoundingClientRect();
  assert(rect.width<=401&&rect.width>=370,'compact panel restored');
  assert(!ui.querySelector('.surface')&&!ui.querySelector('.console'),'redesign removed');
  assert(ui.querySelectorAll('.tab').length===7,'original tabs plus plugins/dev');
  assert(ui.querySelector('.ascii-mini').textContent.includes(String.fromCharCode(0x28ff)),'ASCII added');
  assert(izify.plugins.list()[0].id==='ad-block','adblock first');
  await izify.plugins.enable('ad-block',false);
  const calls=[];
  class Slots{static SERVICE_ID='spotify.ads.esperanto.slots.proto.Slots';constructor(transport){this.transport=transport;calls.push('construct');}getSlots(){return this.transport.callSingle();}clearAllAds(){calls.push('clear');}}
  const settings={updateAdServerEndpoint:async()=>calls.push('endpoint'),updateSlotEnabled:async()=>calls.push('slot')};
  const invalid={productTransport:true},valid={callSingle:async()=>({adSlots:[{slotId:'test'}]})};
  const audio={disable(){calls.push('disable')},enable(){calls.push('enable')},isNewAdsNpvEnabled:true};
  const platform={AdManagers:{audio},getTransport:()=>invalid,UserAPI:{_product_state:{transport:invalid}}};
  const root=document.querySelector('#main');root.__reactFiber$fixture={memoizedProps:{value:platform}};
  function req(id){return req.c[id].exports};req.c={svc:{exports:{Slots,settingsClient:settings}}};req.m={svc:function(){/* spotify.ads.esperanto */}};
  window.webpackChunkMock={push(chunk){return chunk[2](req)}};
  await izify.plugins.enable('ad-block',true);
  for(let i=0;i<80&&!calls.includes('disable');i++)await new Promise(r=>setTimeout(r,20));
  assert(!calls.includes('construct'),'invalid transport not used');
  assert(!window.izifyAds.status().slots&&!window.izifyAds.status().transporte,'invalid transport reported');
  assert(!izify.logs.list().some(r=>r.level==='error'&&r.msg.includes('callSingle')),'no repeated callSingle errors');
  assert(calls.includes('disable'),'other layers still active');
  await izify.plugins.enable('ad-block',false);calls.length=0;
  req.c.extra={exports:{transport:valid}};
  await izify.plugins.enable('ad-block',true);
  for(let i=0;i<80&&!calls.includes('disable');i++)await new Promise(r=>setTimeout(r,20));
  assert(calls.includes('construct')&&calls.includes('slot')&&calls.includes('clear'),'alternate valid transport used');
  assert(window.izifyAds.status().slots===1,'slots functional');
  assert(window.izifyAds.status().origemTransporte==='exports.transport','transport origin diagnostic');
  await izify.plugins.enable('ad-block',false);
  // Current native clients use a DI registry even when req.c is not exported.
  const encode=value=>new TextEncoder().encode(JSON.stringify(value));
  const codec={fromPartial:v=>v,encode:v=>({finish:()=>encode(v)}),decode:b=>JSON.parse(new TextDecoder().decode(b))};
  const responseCodec={...codec,fromPartial:v=>({adPackage:{},...v})};
  const nativeRequests=[],nativeFlags=new Map([['test',true]]);let overrides=null;
  const rpc={callSingle:async request=>{
    if(!request)return {adSlots:[{slotId:'test'}]};
    nativeRequests.push(request.method);
    if(request.method==='UpdateSlotEnabled'){const value=codec.decode(request.payload);nativeFlags.set(value.slotId,value.enabled);}
    return encode(request.method==='GetAds'?{adPackage:{test:{ads:[{id:'should-not-load'}]}}}:{});
  }};
  const originalRpc=rpc.callSingle;
  class SettingsClient{static SERVICE_ID='spotify.ads.esperanto.proto.Settings';static METHODS={updateSlotEnabled:{requestType:codec}};constructor(transport){this.transport=transport;}async getSlotSettings({slotId}){return {slotSettings:[{id:slotId,enabled:nativeFlags.get(slotId)}]};}updateSlotEnabled(value){return this.transport.callSingle({service:SettingsClient.SERVICE_ID,method:'UpdateSlotEnabled',payload:encode(value)});}}
  class AdsClient{static SERVICE_ID='spotify.ads.esperanto.proto.Ads';static METHODS={getAds:{requestType:codec,responseType:responseCodec}};constructor(transport){this.transport=transport;}getAds(value){return this.transport.callSingle({service:AdsClient.SERVICE_ID,method:'GetAds',payload:encode(value)}).then(codec.decode);}}
  const player={getState:()=>({item:{type:'track',uri:'spotify:track:test'},isPaused:true})};
  const product={productStateApi:{putOverridesValues:async({pairs})=>{assert(Object.keys(pairs).join(',')==='ads','only local ads override');overrides=pairs;},delOverridesValues:async()=>{overrides=null;}}};
  const registry={_map:new Map([[Symbol('EsperantoTransport'),{instance:rpc}],[Symbol('PlayerAPI'),{instance:player}],[Symbol('ProductStateAPI'),{instance:product}]])};
  platform.getRegistry=()=>registry;
  const privateExports={svc:{Slots,SettingsClient,AdsClient}};
  function hiddenReq(id){return privateExports[id]};hiddenReq.m=req.m;
  window.webpackChunkMock.push=chunk=>chunk[2](hiddenReq);
  await izify.plugins.enable('ad-block',true);await window.izifyAds.ready;
  assert(window.izifyAds.status().filtroNativo&&window.izifyAds.status().playerNativo,'native registry discovered');
  const inventory=await new AdsClient(rpc).getAds({slotId:'test'});
  assert(Object.keys(inventory.adPackage).length===0&&!nativeRequests.includes('GetAds'),'GetAds blocked before native dispatch');
  await new SettingsClient(rpc).updateSlotEnabled({slotId:'test',enabled:true});
  assert(nativeFlags.get('test')===false,'slot reenable blocked');
  assert(player.getState().isPaused&&player.getState().item.type==='track','playback state preserved');
  await izify.plugins.enable('ad-block',false);
  assert(rpc.callSingle===originalRpc&&nativeFlags.get('test')===true&&overrides===null,'native filter and state restored');
  delete window.webpackChunkMock;delete root.__reactFiber$fixture;
  const addon=`/* @izify-plugin {"id":"smoke","name":"Smoke <test>","description":"Test addon","author":"Tests","version":"1.0.0"} */ izify.registerPlugin({id:'smoke',start(api){console.info('plugin console');api.style('body{outline:1px solid red}');api.interval(()=>window.testTicks=(window.testTicks||0)+1,50);api.on(window,'test-addon',()=>window.testEvents=(window.testEvents||0)+1);return()=>api.log.info('stop');}});`;
  await izify.plugins.install(addon);assert(izify.plugins.list().find(p=>p.id==='smoke').phase==='disabled','import disabled');
  await izify.plugins.enable('smoke',true);await wait();window.dispatchEvent(new Event('test-addon'));
  const ticks=window.testTicks;assert(ticks>0&&window.testEvents===1,'addon resources');
  await izify.plugins.enable('smoke',false);await wait();window.dispatchEvent(new Event('test-addon'));
  assert(window.testTicks===ticks&&window.testEvents===1&&!document.querySelector('[data-izify-plugin="smoke"]'),'addon cleanup');
  assert(izify.logs.list().some(r=>r.source==='smoke'&&r.msg==='plugin console'),'console in shared logs');
  izify.open('estilo');ui.querySelector('[data-font="Georgia"]').click();await wait();
  assert(izify.state.style.font==='Georgia','font selection');
  assert(getComputedStyle(ui.querySelector('[data-font="Georgia"]')).fontFamily.includes('Georgia'),'font names render their font');
  assert(getComputedStyle(ui.querySelector('#fontPreview')).fontFamily.includes('Georgia'),'preview');
  const search=ui.querySelector('#fontSearch');search.value='Consolas';search.dispatchEvent(new Event('input',{bubbles:true}));
  assert(ui.querySelectorAll('.font-option').length===1,'font search separate from list');
  izify.open('plugins');assert(ui.querySelector('#pluginList').textContent.includes('Smoke <test>')&&!ui.querySelector('#pluginList test'),'metadata escaped');
  izify.open('dev');izify.logs.write('smoke','warn','needle <b>');await wait();
  const query=ui.querySelector('#logSearch');query.value='needle';query.dispatchEvent(new Event('input',{bubbles:true}));await wait();
  assert(ui.querySelectorAll('#devLogs .log-row').length===1,'dev filtering');
  return {ok:true,logs:izify.logs.list().length,transportRegression:true,compactWidth:rect.width};
})()
'@
$result = Eval-Test $checks
$result | ConvertTo-Json -Compress | Write-Host
Eval-Test "izify.open('cores')" | Out-Null
Save-Shot 'panel'
Eval-Test "izify.open('plugins')" | Out-Null
Save-Shot 'plugins'
Eval-Test "izify.open('dev')" | Out-Null
Save-Shot 'dev'
foreach ($size in @(@(390,844),@(1280,500))) {
    Invoke-IzifyCdp $endpoint 'Emulation.setDeviceMetricsOverride' @{width=$size[0];height=$size[1];deviceScaleFactor=1;mobile=$false} -Connection $session | Out-Null
    $bounds = Eval-Test "(()=>{izify.open('cores');const r=document.querySelector('#izify-host').shadowRoot.querySelector('.panel').getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom,h:innerHeight,w:innerWidth};})()"
    if ($bounds.x -lt 0 -or $bounds.right -gt $bounds.w -or $bounds.bottom -gt $bounds.h) { throw 'Responsive bounds failed' }
    Save-Shot ('responsive-' + $size[0])
}
Eval-Test (Get-IzifyBundle -Root $root) | Out-Null
$restored = Eval-Test "({hosts:document.querySelectorAll('#izify-host').length,font:izify.state.style.font,plugins:izify.plugins.list()})"
if ($restored.hosts -ne 1 -or $restored.font -ne 'Georgia') { throw 'Reload persistence failed' }
Eval-Test "izify.plugins.remove('ad-block')" | Out-Null
Eval-Test (Get-IzifyBundle -Root $root) | Out-Null
if (Eval-Test "izify.plugins.list().some(p=>p.id==='ad-block')") { throw 'Deleted built-in came back' }
Eval-Test "izify.plugins.restoreBuiltin(__izifyAssets.builtins[0].source)" | Out-Null
Eval-Test "izify.plugins.remove('smoke');izify.destroy()" | Out-Null
if ((Eval-Test "document.querySelectorAll('#izify-host,#izify-btn,#izify-theme,#izify-ads-css').length") -ne 0) { throw 'Full cleanup failed' }
Write-Host 'PASS: compact UI, transport regression, plugin lifecycle/logs, fonts, persistence, responsive layout.'

} finally { Close-IzifyCdp $session }
