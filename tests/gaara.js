(async()=>{
  const assert=(v,m)=>{if(!v)throw new Error(m)},wait=(ms=240)=>new Promise(r=>setTimeout(r,ms));
  const original=izify.state,ui=document.querySelector('#izify-host').shadowRoot;
  const host=document.createElement('div');host.id='gaaraFeatureFixture';
  host.innerHTML='<div data-testid="home-page"><div id="gaaraHomeOriginal">Músicas e atalhos originais</div></div><div id="gaaraLyricsFrame" style="position:relative;width:760px;height:280px"><div id="gaaraLyricsViewport" style="height:280px;overflow-y:auto"><section style="--lyrics-color-background:#332222;--lyrics-color-active:white;--lyrics-color-inactive:gray"><div id="gaaraLyricsTrack">'+Array.from({length:14},(_,i)=>`<div data-testid="lyrics-line" class="gaaraTestLine ${i===0?'gaaraTestActive':''}">Linha ${i+1}: a música atravessa as dunas.</div>`).join('')+'</div></section></div></div>';
  const slider=document.createElement('div');slider.dataset.testid='volume-bar';slider.innerHTML='<div data-testid="progress-bar"><div data-testid="progress-bar-handle"></div></div>';host.append(slider);
  const sheet=document.createElement('style');sheet.textContent='.gaaraTestLine{height:64px;font-size:28px;line-height:36px;color:var(--lyrics-color-inactive)}.gaaraTestLine.gaaraTestActive{color:var(--lyrics-color-active)}';
  document.body.append(host);document.head.append(sheet);
  try{
    izify.performance.setMode('normal');izify.applyPreset('gaara');izify.close();await wait(450);
    const banner=host.querySelector('.izify-gaara-home');assert(banner&&host.querySelector('#gaaraHomeOriginal'),'Gaara banner preserves original Home content');
    assert(banner.querySelectorAll('button').length===3&&banner.querySelector('[data-atmosphere="dusk"]').getAttribute('aria-pressed')==='true','three selectable desert atmospheres');
    for(const [id,color] of [['night','#91c5b9'],['dunes','#e2c39a'],['dusk','#e9b86c']]){
      banner.querySelector(`[data-atmosphere="${id}"]`).click();await wait();
      assert(izify.state.colors.accent===color&&izify.state.preset==='gaara'&&izify.state.decor.wallpaper==='gaara','palette changes keep Gaara identity: '+id);
      assert(banner.querySelector(`[data-atmosphere="${id}"]`).getAttribute('aria-pressed')==='true','palette button reports selection: '+id);
    }
    const focus=host.querySelector('.izify-gaara-focus'),lines=host.querySelectorAll('[data-testid="lyrics-line"]');
    assert(focus&&focus.getAttribute('aria-pressed')==='false','contextual lyrics focus button');
    focus.click();await wait();assert(izify.state.decor.gaaraFocus&&focus.getAttribute('aria-pressed')==='true','lyrics focus is interactive and persisted in theme state');
    assert(getComputedStyle(lines[0]).opacity==='1'&&Number(getComputedStyle(lines[1]).opacity)<.3,'focus highlights only active lyric');
    lines[0].classList.remove('gaaraTestActive');lines[1].classList.add('gaaraTestActive');await wait(450);
    assert(lines[1].hasAttribute('data-izify-lyric-active')&&getComputedStyle(lines[1]).opacity==='1','focus follows native lyric transition');
    focus.click();await wait();assert(!izify.state.decor.gaaraFocus&&Number(getComputedStyle(lines[2]).opacity)>.5,'focus can be disabled without disabling lyrics');
    const viewport=host.querySelector('#gaaraLyricsViewport'),scene=host.querySelector('.izify-lyrics-scene');const rect=scene.getBoundingClientRect().toJSON();
    viewport.scrollTop=80;await wait();assert(JSON.stringify(scene.getBoundingClientRect().toJSON())===JSON.stringify(rect),'new Gaara sand layer stays fixed while scrolling');
    const previous=getComputedStyle(scene,'::before').backgroundImage;assert(previous.includes('data:image/svg+xml'),'desert contour art is present');
    izify.set('decor.gaaraSand',false);izify.set('decor.gaaraSeal',false);await wait();
    assert(getComputedStyle(scene,'::before').backgroundImage==='none'&&getComputedStyle(scene,'::after').content==='none'&&banner.querySelector('img').hidden,'sand and decorative seals can be disabled');
    izify.set('decor.gaaraSand',true);izify.set('decor.gaaraSeal',true);await wait();
    izify.open('estilo');assert(!ui.querySelector('#gaaraFeatures').hidden,'Gaara has dedicated personalization controls');
    const select=ui.querySelector('[data-path="decor.gaaraAtmosphere"]');select.value='night';select.dispatchEvent(new Event('input',{bubbles:true}));await wait();
    assert(izify.state.colors.accent==='#91c5b9'&&izify.state.decor.gaaraAtmosphere==='night','personalization and Home use the same atmosphere setting');
    izify.set('decor.gaaraHome',false);await wait();assert(!host.querySelector('.izify-gaara-home')&&host.querySelector('#gaaraHomeOriginal'),'Home artwork can be removed without removing native content');
    izify.set('decor.gaaraHome',true);await wait();assert(host.querySelectorAll('.izify-gaara-home').length===1,'Home artwork returns without duplication');
    for(const name of ['gaaraSeal','gaaraGourd','gaaraLikedSongs']){const image=new Image();image.src=izify.personalization.getAsset(name);await image.decode();assert(image.naturalWidth>0,'offline SVG decodes: '+name);}
    const handle=slider.querySelector('[data-testid="progress-bar-handle"]');
    assert(getComputedStyle(handle).backgroundImage.includes(izify.personalization.getAsset('gaaraGourd')),'volume uses the sand gourd');
    izify.set('decor.progressHandle','none');await wait();assert(getComputedStyle(handle).backgroundImage==='none','original slider choice removes Gaara handle art');
    izify.set('decor.progressHandle','gaara');await wait();assert(getComputedStyle(handle).backgroundImage.includes(izify.personalization.getAsset('gaaraGourd')),'Gaara handles can be restored');
    izify.set('style.noAnim',true);await wait();assert(getComputedStyle(lines[1]).transitionDuration==='0s','Gaara lyrics respect disabled transitions');
    izify.set('style.noAnim',false);await wait();
    izify.applyPreset('kuromi');await wait();
    assert(!host.querySelector('.izify-gaara-home,.izify-gaara-tools')&&document.documentElement.dataset.izifyCharacter==='kuromi'&&ui.querySelector('#gaaraFeatures').hidden,'switching themes removes Gaara components and controls');
    izify.applyPreset('spotify');await wait();assert(!document.documentElement.hasAttribute('data-izify-character')&&!document.querySelector('.izify-gaara-home,.izify-gaara-tools'),'native Spotify remains free of Gaara decorations');
    return {gaaraFeatures:true,atmospheres:3,offlineVectors:true,fixedArtwork:true};
  }finally{
    host.remove();sheet.remove();for(const [key,value] of Object.entries(original))if(key!=='preset')izify.set(key,value);izify.set('preset',original.preset);await wait();
  }
})()
