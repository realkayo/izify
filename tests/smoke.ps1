param([Parameter(Mandatory)][int]$Port, [string]$NativeCss = '')
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
Invoke-IzifyCdp $endpoint 'Emulation.setDeviceMetricsOverride' @{width=1280;height=900;deviceScaleFactor=1;mobile=$false} -Connection $session | Out-Null
function Eval-Test([string]$Expression) { Invoke-IzifyExpression -WebSocketUrl $endpoint -Expression $Expression -Connection $session }
try {
Eval-Test '(async()=>{if(window.__izify)await window.__izify.destroy();localStorage.clear();await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase("izify");r.onsuccess=resolve;r.onerror=reject;});})()' | Out-Null
Eval-Test @'
window.captureNativeAppearance=()=>[['.nativeMain3','backgroundColor'],['.nativeMain3','borderRadius'],['.nativeSide2','backgroundColor'],['.fixtureCard6','backgroundColor'],['.nativeText1','color'],['.fixtureTrack','height'],['html','fontSize'],['body','fontFamily'],['[data-testid="cover-art-image"]','borderRadius']].map(([selector,property])=>getComputedStyle(document.querySelector(selector))[property]);
window.nativeAppearanceBeforeIzify=window.captureNativeAppearance();
'@ | Out-Null
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
  assert(ui.querySelectorAll('.tab:not([hidden])').length===5,'five user tabs');
  assert(!ui.querySelector('[data-t="esconder"]')&&!ui.querySelector('[data-tab="esconder"]'),'hide section removed');
  assert(ui.querySelector('[data-t="dev"]').hidden,'dev hidden initially');
  izify.open('dev');ui.querySelector('[data-t="dev"]').click();
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'d',ctrlKey:true,shiftKey:true,bubbles:true}));
  assert(!ui.querySelector('[data-tab="dev"]').classList.contains('on'),'dev opening cannot bypass clicks');
  for(let i=0;i<9;i++)ui.querySelector('#izifyVersion').click();
  assert(ui.querySelector('[data-t="dev"]').hidden,'nine clicks keep dev hidden');
  ui.querySelector('#izifyVersion').click();
  assert(!ui.querySelector('[data-t="dev"]').hidden,'tenth click unlocks dev');
  assert(!ui.querySelector('[data-path="style.radius"]')&&!ui.querySelector('[data-path="style.gap"]')&&!ui.querySelector('[data-path="style.cardRadius"]'),'format controls removed');
  assert(!ui.querySelector('#pluginRestore'),'restore adblock button removed');
  assert([...document.querySelectorAll('[data-testid="cover-art-image"]')].every(n=>getComputedStyle(n).display!=='none'&&n.naturalWidth>0),'album and player covers visible');
  assert(getComputedStyle(document.querySelector('[data-testid="upgrade-button"]')).display==='none','premium hidden by active adblock');
  assert(izifyAds.hide('img[data-testid="cover-art-image"]')===false&&izifyAds.hide('[data-testid="now-playing-widget"]')===false,'artwork and parent cannot be hidden');
  const lateBanner=document.createElement('div');lateBanner.dataset.adSlot='fixture';document.body.append(lateBanner);
  assert(getComputedStyle(lateBanner).display==='none','ad banner hidden');
  lateBanner.append(document.querySelector('[data-testid="cover-art-image"]').cloneNode());
  assert(getComputedStyle(lateBanner).display!=='none','late cover keeps ancestor visible');lateBanner.remove();
  const menu=document.createElement('div');menu.setAttribute('role','menu');
  menu.innerHTML='<button role="menuitem">Explorar Premium</button><button role="menuitem">Configurações</button>';
  document.body.append(menu);await wait();
  assert(getComputedStyle(menu.firstChild).display==='none'&&getComputedStyle(menu.lastChild).display!=='none','late premium menu hidden without affecting other options');
  assert(ui.querySelector('.ascii-mini').textContent.includes(String.fromCharCode(0x28ff)),'ASCII added');
  assert(izify.plugins.list()[0].id==='ad-block','adblock first');
  await izify.plugins.enable('ad-block',false);
  assert(getComputedStyle(document.querySelector('[data-testid="upgrade-button"]')).display!=='none','premium lifecycle belongs to plugin');
  assert(getComputedStyle(menu.firstChild).display!=='none','premium menu restored on disable');menu.remove();
  const calls=[];
  class Slots{static SERVICE_ID='spotify.ads.esperanto.slots.proto.Slots';constructor(transport){this.transport=transport;calls.push('construct');}getSlots(){return this.transport.callSingle();}clearAllAds(){calls.push('clear');}}
  const settings={updateAdServerEndpoint:async()=>calls.push('endpoint'),updateSlotEnabled:async()=>calls.push('slot')};
  const invalid={productTransport:true},valid={callSingle:async()=>({adSlots:[{slotId:'test'}]})};
  const audio={disable(){calls.push('disable')},enable(){calls.push('enable')},isNewAdsNpvEnabled:true};
  const platform={AdManagers:{audio},getTransport:()=>invalid,UserAPI:{_product_state:{transport:invalid}}};
  const root=document.querySelector('#main');root.__reactFiber$fixture={memoizedProps:{value:platform}};
  function req(id){return req.c[id].exports};req.c={svc:{exports:{Slots,settingsClient:settings}}};req.m={svc:function(){/* spotify.ads.esperanto */}};
  const nativeChunk=[[123],{nativeModule:()=>{}},()=>{}],legacyProbe=[[Symbol()],{},(r)=>{req=r;return r;}];
  window.webpackChunkMock=[nativeChunk,legacyProbe];window.webpackChunkMock.push=function(chunk){Array.prototype.push.call(this,chunk);return chunk[2](req)};
  await izify.plugins.enable('ad-block',true);
  for(let i=0;i<80&&!calls.includes('disable');i++)await new Promise(r=>setTimeout(r,20));
  assert(!calls.includes('construct'),'invalid transport not used');
  assert(!window.izifyAds.status().slots&&!window.izifyAds.status().transporte,'invalid transport reported');
  assert(!izify.logs.list().some(r=>r.level==='error'&&r.msg.includes('callSingle')),'no repeated callSingle errors');
  assert(calls.includes('disable'),'other layers still active');
  assert(window.webpackChunkMock.length===1&&window.webpackChunkMock[0]===nativeChunk&&window.izifyAds.status().sondasAntigasLiberadas===1,'old runtime probe released and native chunks preserved');
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
  window.webpackChunkMock.push=function(chunk){Array.prototype.push.call(this,chunk);return chunk[2](hiddenReq)};
  await izify.plugins.enable('ad-block',true);await window.izifyAds.ready;
  assert(window.izifyAds.status().filtroNativo&&window.izifyAds.status().playerNativo,'native registry discovered');
  const inventory=await new AdsClient(rpc).getAds({slotId:'test'});
  assert(Object.keys(inventory.adPackage).length===0&&!nativeRequests.includes('GetAds'),'GetAds blocked before native dispatch');
  await new SettingsClient(rpc).updateSlotEnabled({slotId:'test',enabled:true});
  assert(nativeFlags.get('test')===false,'slot reenable blocked');
  assert(player.getState().isPaused&&player.getState().item.type==='track','playback state preserved');
  assert(window.webpackChunkMock.length===1&&window.webpackChunkMock[0]===nativeChunk,'repeated plugin starts do not retain new runtime probes');
  await izify.plugins.enable('ad-block',false);
  assert(rpc.callSingle===originalRpc&&nativeFlags.get('test')===true&&overrides===null,'native filter and state restored');
  for(let i=0;i<5;i++){await izify.plugins.enable('ad-block',true);await window.izifyAds.ready;await izify.plugins.enable('ad-block',false);assert(window.webpackChunkMock.length===1,'plugin reload cannot accumulate runtime probes');}
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
  assert(!ui.querySelector('#fontSearch')&&!ui.querySelector('#fontApply')&&!ui.querySelector('#fontCustom')&&!ui.querySelector('#fontPreview'),'font controls simplified');
  ui.querySelector('#fontReset').click();await wait();assert(izify.state.style.font==='','default font works');
  ui.querySelector('[data-font="Georgia"]').click();await wait();
  izify.open('plugins');assert(ui.querySelector('#pluginList').textContent.includes('Smoke <test>')&&!ui.querySelector('#pluginList test'),'metadata escaped');
  izify.open('dev');izify.logs.write('smoke','warn','needle <b>');await wait();
  const query=ui.querySelector('#logSearch');query.value='needle';query.dispatchEvent(new Event('input',{bubbles:true}));await wait();
  assert(ui.querySelectorAll('#devLogs .log-row').length===1,'dev filtering');
  return {ok:true,logs:izify.logs.list().length,transportRegression:true,compactWidth:rect.width};
})()
'@
$result = Eval-Test $checks
$result | ConvertTo-Json -Compress | Write-Host
$themeChecks = @'
(async()=>{
 const assert=(value,message)=>{if(!value)throw new Error(message)},wait=(ms=180)=>new Promise(resolve=>setTimeout(resolve,ms));
 const original=izify.state,ui=document.querySelector('#izify-host').shadowRoot;
 izify.close();
 const css=(selector,property)=>getComputedStyle(document.querySelector(selector))[property];
 const lyricFixture=document.createElement('section');lyricFixture.id='lyricFixture';lyricFixture.style.cssText='--lyrics-color-background:#27364c;--lyrics-color-active:white;--lyrics-color-inactive:#bbcfee';lyricFixture.innerHTML='<div id="lyricTrack"><div data-testid="lyrics-line" class="fixtureLyric activeLyric">Primeira linha de teste</div><div data-testid="lyrics-line" class="fixtureLyric">Segunda linha de teste</div></div>';document.body.append(lyricFixture);
 const lyricStyle=document.createElement('style');lyricStyle.textContent='.fixtureLyric{font-size:32px;line-height:48px;height:48px;color:var(--lyrics-color-inactive)}.fixtureLyric.activeLyric{color:var(--lyrics-color-active)}';document.head.append(lyricStyle);
 const regression=document.createElement('div');regression.id='themeRegression';regression.innerHTML='<main id="innerPage"><header data-testid="topbar"><div id="fadeBackground" style="opacity:0;--background-base:#553388"></div></header></main><div data-testid="playback-progressbar"><div data-testid="progress-bar"><div class="nativeSliderFill"></div><div data-testid="progress-bar-handle"></div></div></div><div data-testid="volume-bar"><div data-testid="progress-bar"><div class="nativeSliderFill"></div><div data-testid="progress-bar-handle"></div></div></div>';document.querySelector('.nativeMain3').append(regression);
 const cinema=document.createElement('div');cinema.innerHTML='<div class="nativeCinemaFrame"><div class="nativeCinemaBackground"><button class="nativeFocusOutline">Controle</button></div></div>';regression.append(cinema);
 const regressionStyle=document.createElement('style');regressionStyle.textContent='.nativeSliderFill{background:var(--is-active-fg-color);height:4px}[data-testid="progress-bar"]{--is-active-fg-color:#1db954}#themeRegression [data-testid="progress-bar-handle"]{display:none}.nativeCinemaFrame{--cinema-mode-right-sidebar-open:0;outline:var(--panel-gap,8px) solid black}.nativeCinemaBackground{container-name:npv-cinema-mode-background;outline:var(--panel-gap) solid black}.nativeFocusOutline{outline:2px solid #fff}';document.head.append(regressionStyle);
 izify.applyPreset('kuromi');await wait();
 assert(izify.state.bg.brightness===150&&izify.state.bg.panelOpacity===51&&izify.state.bg.glass===10&&izify.state.bg.pattern==='kuromi'&&izify.state.bg.patternOpacity===54&&izify.state.bg.gAngle===0,'official Kuromi uses saved kuromi padrao settings');
 assert(ui.querySelector('[data-preset="kuromi"] strong img')?.src.includes('blob:')&&ui.querySelector('[data-preset="kuromi"] strong').textContent==='Kuromi','Kuromi icon beside preset name');
 const homeFixture=document.createElement('div');homeFixture.id='homeRegression';homeFixture.innerHTML='<div id="homeColor" style="background-color:rgb(80,56,160)"></div><section data-testid="home-page"><div id="homeShortcut"><img id="likedCover" src="https://misc.scdn.co/liked-songs/liked-songs-300.png"><div data-testid="shortcut-background"></div></div></section>';document.body.append(homeFixture);
 assert(css('#homeColor','backgroundColor')==='rgba(0, 0, 0, 0)'&&css('#homeShortcut','backgroundColor')==='rgb(20, 18, 24)','Home decorations use theme instead of album color blocks');
 assert(css('#likedCover','content').includes('blob:'),'Liked Songs gets Kuromi heart cover');
 await wait();
 const lyricMarker=document.querySelector('#lyricTrack .izify-lyrics-kuromi');assert(lyricMarker&&!lyricMarker.hidden&&document.querySelector('#lyricTrack .activeLyric').hasAttribute('data-izify-lyric-active'),'Kuromi follows native active lyric class');
 const firstPosition=lyricMarker.style.transform;document.querySelector('#lyricTrack .activeLyric').classList.remove('activeLyric');document.querySelectorAll('#lyricTrack .fixtureLyric')[1].classList.add('activeLyric');await wait();assert(lyricMarker.style.transform!==firstPosition&&lyricMarker.dataset.moving==='true'&&getComputedStyle(lyricMarker).transitionDuration==='0.38s','one marker glides to next lyric');
 await wait(300);assert(css('#lyricFixture','backgroundColor')==='rgb(7, 6, 9)'&&css('#lyricTrack .activeLyric','color')==='rgb(207, 166, 255)','Kuromi lyric colors: '+css('#lyricFixture','backgroundColor')+' / '+css('#lyricTrack .activeLyric','color'));
 document.querySelector('#lyricTrack .activeLyric').classList.remove('activeLyric');await wait();assert(lyricMarker.hidden,'no guessed active line during instrumental or unsynced lyrics');document.querySelector('#lyricTrack .fixtureLyric').classList.add('activeLyric');await wait();
 izify.set('preset','custom');await wait();assert(document.querySelector('#lyricTrack .izify-lyrics-kuromi')===lyricMarker,'customizing Kuromi keeps lyric decoration');izify.set('preset','kuromi');await wait();
 assert(izify.state.decor.wallpaper==='kuromi'&&izify.state.style.coverRound===12,'preset applies background and geometry');
 assert(css('.nativeSide2','backgroundColor')==='rgba(9, 9, 13, 0.51)','hashed sidebar discovered from CSS grid area');
 assert(css('.nativeMain3','borderRadius')==='18px','panel corners applied');
 assert(css('#innerPage','borderTopWidth')==='0px'&&css('#innerPage','borderRadius')==='0px','inner page does not become a second bordered panel');
 assert(css('.nativeCinemaFrame','outlineStyle')==='none'&&css('.nativeCinemaBackground','outlineStyle')==='none'&&css('.nativeFocusOutline','outlineStyle')==='solid','custom themes remove nested black cinema masks while preserving focus outlines');
 assert(css('#fadeBackground','opacity')==='0'&&css('#innerPage header','backgroundColor')==='rgba(0, 0, 0, 0)','sticky header keeps native reveal instead of painting an empty strip');
 assert(css('#fadeBackground','backgroundColor')==='rgb(33, 28, 42)','sticky background follows theme');
 for(const kind of ['playback-progressbar','volume-bar']){const root='#themeRegression [data-testid="'+kind+'"]';assert(css(root+' .nativeSliderFill','backgroundColor')==='rgb(207, 166, 255)','native active slider uses accent: '+kind);assert(css(root+' [data-testid="progress-bar-handle"]','display')==='flex'&&css(root+' [data-testid="progress-bar-handle"]','backgroundImage').includes('blob:'),'Kuromi handle always visible: '+kind);}
 assert(css('.fixtureCard6','backgroundColor')==='rgb(20, 18, 24)','card color applied');
 assert(css('.nativeMuted8','color')==='rgb(193, 180, 205)','fixed secondary text color adapted');
 assert(!document.querySelector('#izify-background').hidden&&document.querySelector('#izify-background').style.backgroundImage.includes('blob:'),'offline Kuromi wallpaper rendered');
 assert(document.querySelector('#izify-btn img')?.src.includes('blob:')&&css('[data-testid="progress-bar-handle"]','backgroundImage').includes('blob:'),'Kuromi PNG used for button and native progress handle');
 assert(css('#izify-btn','backgroundColor')==='rgb(20, 18, 24)'&&css('#izify-btn','color')==='rgb(255, 241, 255)','Izify button follows the theme instead of native icon colors');
 assert(izify.personalization.listPresets().find(p=>p.id==='kuromi').special&&izify.personalization.getAsset('kuromiHead'),'personalization API exposes presets and assets');
 let changes=0;const off=izify.personalization.subscribe(()=>changes++);izify.personalization.set('style.progressHeight',5);await wait();off();assert(changes===1,'personalization subscription reports changes');
 assert(izify.themeStatus().adaptedRules>10&&izify.themeStatus().surfaces.sidebar>0,'theme coverage reports native stylesheet rules and discovered surfaces');
 izify.set('areas.sidebar','#352144');izify.set('areas.progress','#ff80aa');izify.set('areas.volume','#50d8df');await wait();
 assert(css('.nativeSide2','backgroundColor')==='rgba(53, 33, 68, 0.51)','individual area color applied');
 assert(css('[data-testid="progress-bar"] .x-progressBar-fillColor','backgroundColor')==='rgb(255, 128, 170)','progress color applied');
 assert(css('[data-testid="volume-bar"] .x-progressBar-fillColor','backgroundColor')==='rgb(80, 216, 223)','volume color independent');
 izify.set('style.rowHeight',44);izify.set('style.progressHeight',7);izify.set('style.fontScale',110);await wait();
 assert(css('[data-testid="tracklist-row"]','height')==='44px','track density applied');
 assert(css('[data-testid="progress-bar"] .x-progressBar-fillColor','height')==='7px','progress thickness applied');
 assert(css('html','fontSize')==='17.6px','text size applied');
 izify.applyPreset('gaara');await wait(400);
 assert(css('.nativeCinemaFrame','outlineStyle')==='none'&&css('.nativeCinemaBackground','outlineStyle')==='none','Gaara lyrics have no black edge masks');
 const gaaraMarker=document.querySelector('#lyricTrack .izify-lyrics-gaara');
 assert(izify.state.colors.accent===izify.presets.gaara.colors.accent&&izify.state.style.surfaceRadius===8&&izify.state.bg.glass===0,'Gaara has its own sandstone palette and architecture');
 assert(gaaraMarker&&!gaaraMarker.hidden&&gaaraMarker.src===izify.personalization.getAsset('gaaraHead')&&!document.querySelector('.izify-lyrics-kuromi'),'switching characters replaces lyric marker without Kuromi leftovers');
 const gaaraPosition=gaaraMarker.style.transform;document.querySelector('#lyricTrack .activeLyric').classList.remove('activeLyric');document.querySelectorAll('#lyricTrack .fixtureLyric')[1].classList.add('activeLyric');await wait();assert(gaaraMarker.style.transform!==gaaraPosition&&gaaraMarker.dataset.moving==='true','Gaara follows synced line changes');
 assert(document.querySelector('#izify-btn img')?.src===izify.personalization.getAsset('gaaraSeal')&&ui.querySelector('[data-preset="gaara"] strong img')?.src===izify.personalization.getAsset('gaaraSeal'),'Gaara love seal in theme picker and topbar');
 assert(document.querySelector('#izify-background').style.backgroundImage.includes('blob:')&&css('#lyricFixture','backgroundImage').includes('blob:'),'Gaara wallpaper is used on background and lyrics');
 const lyricFrame=document.createElement('div'),lyricViewport=document.createElement('div');lyricFrame.style.cssText='height:48px;width:340px;position:relative';lyricViewport.style.cssText='height:48px;overflow-y:auto';lyricFixture.before(lyricFrame);lyricFrame.append(lyricViewport);lyricViewport.append(lyricFixture);await wait();
 const scene=lyricFrame.querySelector('.izify-lyrics-scene'),sceneRect=scene.getBoundingClientRect().toJSON(),lineY=lyricFixture.getBoundingClientRect().y;
 assert(scene.parentElement===lyricFrame&&!lyricViewport.contains(scene),'Gaara artwork is outside the scrolling content');
 lyricViewport.scrollTop=24;lyricViewport.dispatchEvent(new Event('scroll'));await wait();assert(JSON.stringify(scene.getBoundingClientRect().toJSON())===JSON.stringify(sceneRect)&&lyricFixture.getBoundingClientRect().y!==lineY,'scroll moves lyric content while Gaara remains stationary');
 assert(getComputedStyle(scene).backgroundRepeat.split(',').every(value=>value.trim()==='no-repeat')&&getComputedStyle(lyricFixture).backgroundColor==='rgba(0, 0, 0, 0)','no repeated or moving artwork underneath the fixed layer');
 lyricFrame.style.width='400px';lyricFrame.style.height='80px';await wait();assert(scene.getBoundingClientRect().width===400&&scene.getBoundingClientRect().height===80,'Gaara layer follows panel resize without scroll correction');
 const savedVisual=JSON.stringify(izify.state),headURL=izify.personalization.getAsset('gaaraHead');
 const decorative=document.createElement('video'),primary=document.createElement('video'),switchAudio=document.createElement('button');let decorativePaused=0,primaryPaused=0,audioRequested=0,decorativeResumed=0;
 decorative.muted=true;decorative.loop=true;Object.defineProperty(decorative,'paused',{get:()=>!(!decorativePaused||decorativeResumed)});decorative.pause=()=>{decorativePaused++};decorative.play=()=>{decorativeResumed++;return Promise.resolve()};primary.pause=()=>primaryPaused++;switchAudio.setAttribute('aria-label','Switch to audio');switchAudio.onclick=()=>audioRequested++;document.body.append(decorative,primary,switchAudio);
 izify.performance.setMode('light');await wait(300);
 assert(JSON.stringify(izify.state)===savedVisual&&document.querySelector('#izify-background').hidden&&!document.querySelector('.izify-lyrics-scene'),'light mode drops decorative rendering without rewriting the theme');
 assert(css('.nativeMain3','backdropFilter')==='none'&&css('.nativeMain3','boxShadow')==='none'&&decorativePaused===1&&primaryPaused===0&&audioRequested===1,'light mode removes costly layers and pauses only muted looping videos');
 assert(izify.personalization.getAsset('gaaraHead')===headURL&&document.querySelector('.izify-lyrics-gaara'),'light mode preserves small icons and lyrics sync');
 const scans=izify.themeStatus().scans,refreshes=izify.themeStatus().refreshes;for(let i=0;i<20;i++)document.querySelector('[data-testid="cover-art-image"]').dispatchEvent(new Event('load'));await wait(250);assert(izify.themeStatus().scans===scans&&izify.themeStatus().refreshes===refreshes,'image loads no longer rescan native stylesheets');
 izify.performance.setMode('normal');await wait();assert(JSON.stringify(izify.state)===savedVisual&&document.querySelector('.izify-lyrics-scene')&&decorativeResumed===1,'visual mode restores artwork, glass and paused decorative video');decorative.remove();primary.remove();switchAudio.remove();
 for(const [kind,asset] of [['playback-progressbar','gaaraSeal'],['volume-bar','gaaraGourd']])assert(css('#themeRegression [data-testid="'+kind+'"] [data-testid="progress-bar-handle"]','backgroundImage').includes(izify.personalization.getAsset(asset)),'Gaara seal and gourd on native sliders');
 assert(css('#likedCover','content').includes(izify.personalization.getAsset('gaaraLikedSongs'))&&css('#likedCover','objectFit')==='cover','Gaara liked-songs illustrated seal cover');
 izify.set('preset','custom');await wait();assert(document.querySelector('#lyricTrack .izify-lyrics-gaara')===gaaraMarker,'Gaara survives color customizations');
 izify.set('style.noAnim',true);await wait();assert(css('#lyricTrack .izify-lyrics-gaara','transitionDuration')==='0s','Gaara respects disabled animations');
 izify.applyPreset('claro');await wait();
 assert(css('#likedCover','content')==='normal'&&css('#homeColor','backgroundColor')==='rgb(80, 56, 160)','other themes restore original Home and cover');homeFixture.remove();
 assert(!document.querySelector('.izify-lyrics-marker,.izify-lyrics-scene,[data-izify-lyrics-frame],[data-izify-lyrics-viewport],[data-izify-lyrics-scene],[data-izify-lyrics-track],[data-izify-lyric-active]'),'switching theme cleans lyric decoration and tracking');lyricFrame.remove();lyricStyle.remove();
 assert(css('#themeRegression [data-testid="progress-bar-handle"]','width')==='12px'&&css('#themeRegression [data-testid="progress-bar-handle"]','display')==='flex','other themes retain visible circular handles');
 assert(css('.nativeMain3','backgroundColor')==='rgb(250, 248, 253)'&&css('.nativeText1','color')==='rgb(36, 29, 49)','light preset changes fixed backgrounds and text');
 assert(css('.main-entityHeader-backgroundColor','backgroundColor')==='rgb(250, 248, 253)','album color can be neutralized');
 assert(!document.querySelector('#izify-background').hasAttribute('style')||document.querySelector('#izify-background').hidden,'preset clears previous wallpaper');
 const lateStyle=document.createElement('style'),lateNode=document.createElement('div');lateStyle.textContent='@layer themeFixture{@media (min-width:1px){.lateThemeRule9{background-color:#121212;color:#b3b3b3}}}';lateNode.className='lateThemeRule9';document.head.append(lateStyle);document.body.append(lateNode);await wait(300);
 assert(css('.lateThemeRule9','backgroundColor')==='rgb(250, 248, 253)','new native CSS and media queries themed');lateStyle.remove();lateNode.remove();
 const ini='[Dark]\ntext=fff\nmain=14101f\nsidebar=09060d\nbutton=166,128,224\nbutton-active=c4a0ff\n[Light]\ntext=222222\nmain=fafafa';
 const schemes=__izifyModules.parseThemeINI(ini);assert(schemes.Dark.colors.button==='#a680e0'&&schemes.Dark.areas.sidebar==='#09060d','color.ini hex/RGB mapping');
 const transfer=new DataTransfer();transfer.items.add(new File([ini],'color.ini',{type:'text/plain'}));ui.querySelector('#themeFile').files=transfer.files;ui.querySelector('#themeFile').dispatchEvent(new Event('change',{bubbles:true}));await wait();
 assert(izify.state.colors.panel==='#14101f'&&ui.querySelector('#themeScheme').options.length===2,'palette import control works');ui.querySelector('#themeScheme').value='Light';ui.querySelector('#themeScheme').dispatchEvent(new Event('change'));await wait();assert(izify.state.colors.panel==='#fafafa','imported palette selector works');
 izify.set('bg.blur',900);izify.set('colors.accent','bad');await wait();assert(izify.state.bg.blur===40&&izify.state.colors.accent==='#1ed760','invalid preferences normalized');
 regression.remove();regressionStyle.remove();
 izify.set('css','.nativeMain3{border-radius:27px!important}');await wait();assert(css('.nativeMain3','borderRadius')==='27px','custom CSS applied before restoring native');
 izify.applyPreset('spotify');await wait();
 assert(JSON.stringify(window.captureNativeAppearance())===JSON.stringify(window.nativeAppearanceBeforeIzify),'Spotify preset restores exact native computed appearance');
 assert(!document.querySelector('#izify-theme,#izify-custom,#izify-palette,#izify-background')&&izify.themeStatus().native,'Spotify preset disables every theme stylesheet and wallpaper');
 assert(izify.state.css.includes('27px'),'native mode preserves saved custom CSS without applying it');
 const pendingStyle=document.createElement('style');pendingStyle.textContent='.nativeText1{color:#fff}';document.head.append(pendingStyle);await wait(300);assert(!document.querySelector('#izify-palette'),'late styles do not reactivate native-mode adaptation');pendingStyle.remove();
 izify.set('css','');izify.applyPreset('spotify');await wait();
 assert(!document.querySelector('#izify-btn img')&&css('[data-testid="progress-bar-handle"]','width')==='12px','native mode restores icon and progress handle');
 for(const id of Object.keys(izify.presets)){izify.personalization.applyPreset(id);await wait(50);assert(css('.fixtureQuickPlay','backgroundColor')==='rgba(0, 0, 0, 0)'&&css('.fixtureQuickPlay svg','visibility')==='hidden','play circle and glyph remain hidden until hover: '+id);}
 izify.applyPreset('spotify');izify.set('colors.accent','#c4a0ff');await wait();assert(izify.state.colors.button==='#c4a0ff','accent control updates linked button color');
 for(const [key,value] of Object.entries(original))izify.set(key,value);await wait();
 return {themes:Object.keys(izify.presets).length,adaptedRules:izify.themeStatus().adaptedRules,themeRegression:true};
})()
'@
Eval-Test $themeChecks | ConvertTo-Json -Compress | Write-Host
Eval-Test ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'gaara.js'),[Text.Encoding]::UTF8)) | ConvertTo-Json -Compress | Write-Host
Invoke-IzifyCdp $endpoint 'DOM.enable' -Connection $session | Out-Null
Invoke-IzifyCdp $endpoint 'CSS.enable' -Connection $session | Out-Null
$dom = Invoke-IzifyCdp $endpoint 'DOM.getDocument' @{depth=0} -Connection $session
$quick = Invoke-IzifyCdp $endpoint 'DOM.querySelector' @{nodeId=$dom.root.nodeId;selector='#hoverQuickLink'} -Connection $session
Invoke-IzifyCdp $endpoint 'CSS.forcePseudoState' @{nodeId=$quick.nodeId;forcedPseudoClasses=@('hover')} -Connection $session | Out-Null
if (-not (Eval-Test "getComputedStyle(document.querySelector('.fixtureQuickPlay svg')).visibility==='visible' && getComputedStyle(document.querySelector('.fixtureQuickPlay')).backgroundColor!=='rgba(0, 0, 0, 0)'")) { throw 'Play circle and glyph must appear together on hover' }
Invoke-IzifyCdp $endpoint 'CSS.forcePseudoState' @{nodeId=$quick.nodeId;forcedPseudoClasses=@()} -Connection $session | Out-Null
if (-not (Eval-Test "getComputedStyle(document.querySelector('.fixtureQuickPlay svg')).visibility==='hidden' && getComputedStyle(document.querySelector('.fixtureQuickPlay')).backgroundColor==='rgba(0, 0, 0, 0)'")) { throw 'Play circle must disappear with glyph when hover ends' }
if ($NativeCss) {
    $nativeJson = ConvertTo-Json -InputObject $NativeCss -Compress
    $nativeExpression = '(async()=>{const native=document.createElement("style");native.textContent=' + $nativeJson + ';document.head.append(native);await new Promise(resolve=>setTimeout(resolve,650));const status=izify.themeStatus();native.remove();await new Promise(resolve=>setTimeout(resolve,200));if(status.adaptedRules<100)throw new Error("Native Spotify CSS adaptation failed");return {nativeSpotifyCSS:true,adaptedRules:status.adaptedRules,sheets:status.sheets};})()'
    Eval-Test $nativeExpression | ConvertTo-Json -Compress | Write-Host
}
Eval-Test "izify.open('cores')" | Out-Null
Eval-Test "document.querySelector('#izify-host').shadowRoot.querySelectorAll('.toast').forEach(n=>n.remove())" | Out-Null
Save-Shot 'panel'
Eval-Test "izify.open('estilo')" | Out-Null
Save-Shot 'fonts'
Eval-Test "izify.open('plugins')" | Out-Null
Save-Shot 'plugins'
Eval-Test "izify.open('dev')" | Out-Null
Save-Shot 'dev'
Eval-Test "izify.applyPreset('kuromi');izify.close();document.querySelectorAll('#main > .Root__top-container').forEach(n=>n.style.display='none')" | Out-Null
Save-Shot 'theme-kuromi'
Eval-Test "izify.open('cores')" | Out-Null
Save-Shot 'theme-kuromi-settings'
Eval-Test "izify.applyPreset('claro');izify.close()" | Out-Null
Save-Shot 'theme-claro'
Eval-Test "izify.applyPreset('oceano')" | Out-Null
Save-Shot 'theme-oceano'
Eval-Test ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'gaara-preview.js'),[Text.Encoding]::UTF8)) | Out-Null
Save-Shot 'gaara-home'
Eval-Test 'izify.set("decor.gaaraAtmosphere","night");new Promise(r=>setTimeout(r,250))' | Out-Null
Save-Shot 'gaara-home-night'
Eval-Test 'document.querySelector("#gaaraPreviewHome").style.display="none";document.querySelector("#gaaraPreviewLyricFrame").style.display="block";izify.set("decor.gaaraAtmosphere","dusk");new Promise(r=>setTimeout(r,450))' | Out-Null
Save-Shot 'gaara-lyrics'
Eval-Test 'izify.set("decor.gaaraFocus",true);new Promise(r=>setTimeout(r,450))' | Out-Null
Save-Shot 'gaara-lyrics-focus'
Eval-Test 'gaaraPreviewCleanup()' | Out-Null
Eval-Test "izify.applyPreset('spotify');izify.set('style.font','Georgia');document.querySelectorAll('#main > .Root__top-container').forEach(n=>n.style.removeProperty('display'))" | Out-Null
$downloadChecks = @'
(async()=>{
  const assert=(v,m)=>{if(!v)throw new Error(m)},wait=()=>new Promise(r=>setTimeout(r,50));
  izify.close();
  const real=window.__izifyDownloadBridge;
  window.testRealBridge=real;
  const requests=[];
  window.__izifyDownloadBridge={request:async(operation,data)=>{
    requests.push({operation,data});
    if(operation==='status')return {ready:true,folder:'C:\\Downloads\\Izify'};
    if(operation==='search')return {entries:[{title:'Fonte <segura>',artist:'Artista',url:'https://www.youtube.com/watch?v=abcdefghijk'}]};
    if(operation==='inspect')return {title:'Fonte <segura>',artist:'Artista',url:data.url,video:true,audioFormats:['m4a','webm']};
    if(operation==='download')return {file:'C:\\Downloads\\Izify\\musica.mp4'};
  }};
  document.querySelector('#izify-host').shadowRoot.querySelectorAll('.overlay').forEach(n=>n.remove());
  const trackLink=document.createElement('a');trackLink.href='https://open.spotify.com/track/fixtureA';
  document.querySelector('[data-testid="now-playing-widget"]').append(trackLink);
  const button=document.querySelector('#izify-download-btn');assert(button,'download button in player');
  button.click();await wait();
  const host=document.querySelector('#izify-download-host'),ui=host.shadowRoot;
  assert(getComputedStyle(ui.querySelector('.primary')).backgroundColor==='rgb(167, 139, 250)','download uses welcome purple');
  assert(requests.some(r=>r.operation==='search'&&r.data.query==='Musica de teste'),'current track resolved without clicking search');
  assert(requests.some(r=>r.operation==='inspect'),'automatic source inspected');
  assert(!ui.querySelector('#download').disabled&&!ui.querySelector('#alternate').open,'ready to download with manual search collapsed');
  assert(ui.querySelector('.result strong').textContent==='Fonte <segura>'&&!ui.querySelector('segura'),'source metadata rendered as text');
  ui.querySelector('#alternate').open=true;ui.querySelector('.result').click();await wait();
  assert(!ui.querySelector('#format option[value=mp4]').disabled,'video enabled after inspection');
  ui.querySelector('#format').value='mp4';ui.querySelector('#download').click();await wait();
  assert(requests.some(r=>r.operation==='download'&&r.data.format==='mp4'),'chosen output sent to local component');
  assert(ui.querySelector('#status').textContent.includes('musica.mp4'),'saved file reported');
  ui.querySelector('#close').click();assert(host.hidden,'menu closes');
  button.click();await wait();
  assert(requests.filter(r=>r.operation==='search').length===1,'reopening current track reuses source');
  trackLink.href='https://open.spotify.com/track/fixtureB';
  await new Promise(r=>setTimeout(r,1150));
  assert(requests.filter(r=>r.operation==='search').length===2,'different Spotify track ID resolves a new source even with same title');
  const mockBridge=window.__izifyDownloadBridge;
  window.__izifyDownloadBridge={request:(operation,data,signal)=>operation==='search'
    ?new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('cancelada')),{once:true}))
    :mockBridge.request(operation,data,signal)};
  ui.querySelector('#alternate').open=true;ui.querySelector('#search').click();await wait();
  assert(!ui.querySelector('#cancel').hidden,'cancel button shown while waiting');
  ui.querySelector('#cancel').click();await wait();
  assert(ui.querySelector('#cancel').hidden&&!ui.querySelector('#search').disabled,'cancel releases busy state immediately');
  window.__izifyDownloadBridge=mockBridge;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(host.hidden,'Escape closes');
  button.click();await wait();
  return true;
})()
'@
Eval-Test $downloadChecks | Out-Null
Save-Shot 'download'
foreach ($size in @(@(390,844),@(1280,500))) {
    Invoke-IzifyCdp $endpoint 'Emulation.setDeviceMetricsOverride' @{width=$size[0];height=$size[1];deviceScaleFactor=1;mobile=$false} -Connection $session | Out-Null
    $bounds = Eval-Test "(()=>{const root=document.querySelector('#izify-download-host').shadowRoot,r=root.querySelector('.modal').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,h:innerHeight,w:innerWidth};})()"
    if ($bounds.x -lt 0 -or $bounds.y -lt 0 -or $bounds.right -gt $bounds.w -or $bounds.bottom -gt $bounds.h) { throw 'Download responsive bounds failed' }
    Save-Shot ('download-responsive-' + $size[0])
}
Invoke-IzifyCdp $endpoint 'Emulation.setDeviceMetricsOverride' @{width=1280;height=900;deviceScaleFactor=1;mobile=$false} -Connection $session | Out-Null
Eval-Test "(async()=>{await izify.plugins.enable('download',false);if(document.querySelector('#izify-download-btn,#izify-download-host'))throw new Error('Download cleanup failed');await izify.plugins.enable('download',true);})()" | Out-Null
Eval-Test 'window.__izifyDownloadBridge=window.testRealBridge;delete window.testRealBridge' | Out-Null
. (Join-Path $root 'tools/download-bridge.ps1')
Invoke-IzifyDownloadPump -Endpoint $endpoint -Root $root
Eval-Test "window.testDownloadReply=null;window.__izifyDownloadBridge.request('status').then(v=>window.testDownloadReply=v);true" | Out-Null
for ($i=0; $i -lt 30; $i++) {
    Invoke-IzifyDownloadPump -Endpoint $endpoint -Root $root
    if (Eval-Test '!!window.testDownloadReply') { break }
    Start-Sleep -Milliseconds 100
}
if (-not (Eval-Test "!!window.testDownloadReply?.folder && typeof window.testDownloadReply.ready==='boolean'")) { throw 'Download CDP bridge round trip failed' }
Eval-Test @'
(async()=>{
 const bridge=window.__izifyDownloadBridge,controller=new AbortController();
 const promise=bridge.request('search',{query:'cancel fixture'},controller.signal).catch(e=>e.message);
 controller.abort();const batch=bridge.drain();
 if(batch.cancelled.length!==1||!(/cancelada/.test(await promise)))throw new Error('Download cancellation failed');
 return true;
})()
'@ | Out-Null
foreach ($size in @(@(390,844),@(1280,500))) {
    Invoke-IzifyCdp $endpoint 'Emulation.setDeviceMetricsOverride' @{width=$size[0];height=$size[1];deviceScaleFactor=1;mobile=$false} -Connection $session | Out-Null
    $bounds = Eval-Test "(()=>{izify.open('cores');const r=document.querySelector('#izify-host').shadowRoot.querySelector('.panel').getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom,h:innerHeight,w:innerWidth};})()"
    if ($bounds.x -lt 0 -or $bounds.right -gt $bounds.w -or $bounds.bottom -gt $bounds.h) { throw 'Responsive bounds failed' }
    Save-Shot ('responsive-' + $size[0])
}
Eval-Test "izify.applyPreset('kuromi');izify.set('style.font','Georgia');izify.set('areas.progress','#ff80aa');izify.performance.setMode('light');new Promise(resolve=>setTimeout(resolve,320))" | Out-Null
Eval-Test (Get-IzifyBundle -Root $root) | Out-Null
$restored = Eval-Test "({hosts:document.querySelectorAll('#izify-host').length,font:izify.state.style.font,plugins:izify.plugins.list()})"
if ($restored.hosts -ne 1 -or $restored.font -ne 'Georgia') { throw 'Reload persistence failed' }
if (-not (Eval-Test "izify.performance.getState().mode==='light'&&document.documentElement.hasAttribute('data-izify-light')")) {throw 'Performance mode not restored'}
Eval-Test "izify.performance.setMode('normal')"|Out-Null
if (-not (Eval-Test "izify.state.preset==='kuromi' && izify.state.decor.wallpaper==='kuromi' && izify.state.style.coverRound===12 && izify.state.areas.progress==='#ff80aa' && document.querySelectorAll('#izify-palette,#izify-background').length===2")) { throw 'Theme preset persistence/cleanup failed' }
$migration = Eval-Test @'
(async()=>{
  await izify.destroy();
  const old=JSON.parse(localStorage.getItem('izify:config:v2'));
  old.hide={premium:false,selectors:'img[data-testid="cover-art-image"]'};
  old.style.radius=30;old.style.cardRadius=30;old.style.gap=24;
  localStorage.setItem('izify:config:v2',JSON.stringify(old));
})()
'@
Eval-Test (Get-IzifyBundle -Root $root) | Out-Null
if (-not (Eval-Test "!izify.state.hide && izify.state.style.radius===undefined && [...document.querySelectorAll('[data-testid=cover-art-image]')].every(n=>getComputedStyle(n).display!=='none')")) { throw 'Old hiding/geometry preferences were not retired.' }
Eval-Test "izify.plugins.remove('ad-block')" | Out-Null
Eval-Test (Get-IzifyBundle -Root $root) | Out-Null
if (Eval-Test "izify.plugins.list().some(p=>p.id==='ad-block')") { throw 'Deleted built-in came back' }
Eval-Test "izify.plugins.restoreBuiltin(__izifyAssets.builtins[0].source)" | Out-Null
Eval-Test "(async()=>{const api=izify.personalization,url=api.getAsset('kuromiHead');await izify.plugins.remove('smoke');izify.performance.setMode('light');await izify.destroy();let rejected=false;try{api.set('colors.accent','#ff0000')}catch{rejected=true}if(!rejected)throw new Error('Disposed personalization API must reject mutations');let revoked=false;try{await fetch(url)}catch{revoked=true}if(!revoked||document.querySelector('#izify-performance')||document.documentElement.hasAttribute('data-izify-light'))throw new Error('Performance/asset cleanup failed');})()" | Out-Null
if ((Eval-Test "document.querySelectorAll('#izify-host,#izify-btn,#izify-theme,#izify-palette,#izify-background,#izify-ads-css').length") -ne 0) { throw ('Full cleanup failed: ' + (Eval-Test "[...document.querySelectorAll('#izify-host,#izify-btn,#izify-theme,#izify-palette,#izify-background,#izify-ads-css')].map(n=>n.id).join(',')")) }
Write-Host 'PASS: runtime themes/native CSS/color.ini/persistence, compact UI, download menu/CDP bridge/cancellation, transport regression, plugins, fonts and responsive layout.'

} finally { Close-IzifyCdp $session }
