/* Gaara: a separate art direction, with scoped styles and no animation loop. */
(() => {
  'use strict';
  const M=window.__izifyModules ||= {};
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const mix=(a,b,t)=>'#'+rgb(a).map((v,i)=>Math.round(v*(1-t)+rgb(b)[i]*t).toString(16).padStart(2,'0')).join('');
  const alpha=(hex,a)=>`rgba(${rgb(hex).join(',')},${a})`;
  function palette(accent,bg,panel,card,text,subtext){return {...M.themePresets.gaara.colors,accent,bg,panel,card,text,subtext,button:accent,selection:accent,border:mix(panel,text,.16),hover:mix(card,text,.1),tooltip:card,scrollbar:mix(panel,text,.32)};}
  M.gaaraAtmospheres={
    dusk:{name:'Crepúsculo',colors:palette('#e9b86c','#140f0d','#211915','#30231c','#fff1db','#cbb39b')},
    dunes:{name:'Dunas',colors:palette('#e2c39a','#171511','#242017','#342c1e','#fff5df','#c6b99d')},
    night:{name:'Suna à noite',colors:palette('#91c5b9','#0d1212','#141d1c','#1d2a27','#ecf6ee','#adc2b8')},
  };
  M.applyGaaraAtmosphere=(state,id)=>{
    const mood=M.gaaraAtmospheres[id];if(!mood||M.themeCharacter(state)!=='gaara')return;
    state.colors={...mood.colors};state.areas={...M.themeDefaults.areas,player:mood.colors.bg,topbar:mood.colors.bg};
    state.decor.gaaraAtmosphere=id;if(state.preset!=='gaara')state.preset='custom';
  };
  const dunes=color=>'url("data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 300" fill="none" stroke="${color}" stroke-width="1"><path d="M-20 180Q140 40 330 170T730 130M-20 196Q140 56 330 186T730 146M-20 212Q140 72 330 202T730 162M-20 228Q140 88 330 218T730 178M-20 244Q140 104 330 234T730 194M-20 260Q140 120 330 250T730 210"/></svg>`)+'")';
  M.buildGaaraCSS=state=>{
    if(M.themeCharacter(state)!=='gaara')return '';
    const c=state.colors,d=state.decor,seal=M.assetURL('gaaraSeal'),gourd=M.assetURL('gaaraGourd');
    const art=d.gaaraSand&&!M.isLightMode?.(),emblem=d.gaaraSeal;
    const root='html[data-izify-character="gaara"][data-izify-theme]';
    return `
    ${root}{--gaara-seal:url(${JSON.stringify(seal)});--gaara-gourd:url(${JSON.stringify(gourd)});--gaara-ink:#e97e63}
    ${root} #izify-btn{border-radius:9px!important;border:1px solid ${alpha(c.accent,.25)}!important}
    ${d.progressHandle==='gaara'?`
    ${root} :is(.playback-progressbar,[data-testid="playback-progressbar"]) [data-testid="progress-bar-handle"]{background-image:var(--gaara-seal)!important;width:28px!important;height:28px!important;margin-left:-14px!important}
    ${root} :is(.main-nowPlayingBar-volumeBar,[data-testid="volume-bar"]) [data-testid="progress-bar-handle"]{background-image:var(--gaara-gourd)!important;width:24px!important;height:30px!important;margin-left:-12px!important}
    `:''}
    ${root} :is([data-testid="playback-progressbar"],[data-testid="volume-bar"]) .x-progressBar-fillColor{background-image:radial-gradient(circle at 1px 1px,${alpha(c.text,.3)} .7px,transparent .9px)!important;background-size:5px 4px!important}
    ${root} img[src^="https://misc.scdn.co/liked-songs/"]{padding:0!important;object-fit:cover!important}
    ${root} [data-testid="entity-header"]:has(img[src^="https://misc.scdn.co/liked-songs/"]){background:linear-gradient(120deg,${alpha(c.accent,.16)},${c.panel} 70%)!important}
    ${root} [data-testid="home-page"]{background:linear-gradient(160deg,${alpha(c.accent,.07)},transparent 380px)!important}
    ${root} [data-testid="home-page"] div:has(> [data-testid="shortcut-background"]){position:relative;border-radius:6px!important;border-color:${alpha(c.accent,.12)}!important;background:linear-gradient(110deg,${c.card},${alpha(c.panel,.95)})!important}
    ${root} [data-testid="home-page"] div:has(> [data-testid="shortcut-background"])::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${alpha(c.accent,.55)},transparent);pointer-events:none}
    ${root} [data-testid="tracklist-row"][aria-selected="true"]{box-shadow:inset 2px 0 ${c.accent}!important}
    ${root} [data-testid="tracklist-row"]:hover{box-shadow:inset 2px 0 ${alpha(c.accent,.4)}!important}
    ${root} [data-izify-lyrics-track] > [data-testid="lyrics-line"]{padding-inline-start:60px!important;opacity:${d.gaaraFocus ? .24 : .76};transition:${state.style.noAnim?'none':'color .25s ease,opacity .25s ease,text-shadow .25s ease'}!important}
    ${root} [data-izify-lyrics-track] > [data-izify-lyric-active]{opacity:1!important;color:${c.text}!important;text-shadow:0 2px 20px ${alpha(c.accent,.18)}!important}
    ${root} [data-izify-lyrics-track] > [data-testid="lyrics-line"]:hover{opacity:1}
    ${root} .izify-lyrics-gaara{left:8px;filter:drop-shadow(0 2px 5px ${alpha(c.accent,.25)});border-inline-start:2px solid ${alpha(c.accent,.6)};padding-inline-start:3px;box-sizing:content-box}
    ${emblem?`${root} [data-izify-lyrics-track] > [data-izify-lyric-active]::after{content:'';display:inline-block;vertical-align:middle;width:.65em;height:.65em;margin-inline-start:.4em;background-image:var(--gaara-seal);background-size:contain;background-repeat:no-repeat;opacity:.85;pointer-events:none}`:''}
    ${root} .izify-lyrics-scene::before{content:'';position:absolute;inset:0;background-color:${d.gaaraFocus?alpha(c.bg,.42):'transparent'};background-image:${art?dunes(alpha(c.accent,.1)):'none'};background-size:cover;background-position:bottom;pointer-events:none}
    ${emblem?`${root} .izify-lyrics-scene::after{content:'';position:absolute;right:24px;top:24px;width:clamp(44px,6vw,82px);aspect-ratio:1;background-image:var(--gaara-seal);background-size:contain;background-repeat:no-repeat;opacity:.38;pointer-events:none}`:''}
    ${root} .izify-gaara-tools{position:absolute;z-index:4;right:20px;bottom:18px;pointer-events:auto}
    ${root} .izify-gaara-focus{font-family:inherit;font-size:12px;font-weight:600;line-height:1.3;display:flex;align-items:center;gap:8px;min-height:34px;padding:8px 12px;border:1px solid ${alpha(c.accent,.3)};border-radius:7px;background:${alpha(c.bg,.94)};color:${c.text};cursor:pointer}
    ${root} .izify-gaara-focus::before{content:'';width:20px;height:20px;background:var(--gaara-seal) center/contain no-repeat}
    ${root} .izify-gaara-focus:hover,${root} .izify-gaara-focus[aria-pressed="true"]{background:${c.card};border-color:${c.accent}}
    ${root} .izify-gaara-focus:focus-visible,${root} .izify-gaara-home button:focus-visible{outline:2px solid ${c.accent};outline-offset:3px}
    ${root} .izify-gaara-home{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px 28px;margin:8px 0 22px;border:1px solid ${alpha(c.accent,.2)};border-radius:8px;background:linear-gradient(120deg,${c.card},${c.bg});color:${c.text};min-width:0}
    ${root} .izify-gaara-home::before{content:'';position:absolute;inset:0;z-index:-1;background-image:${art?dunes(c.accent):'none'};background-size:cover;background-position:center;opacity:.13;pointer-events:none}
    ${root} .izify-gaara-home-copy{position:relative;min-width:0}
    ${root} .izify-gaara-home-kicker{display:block;font-size:10px;font-weight:700;letter-spacing:.2em;color:${c.accent};margin-bottom:10px}
    ${root} .izify-gaara-home strong{display:block;font-size:clamp(20px,2.8vw,32px);line-height:1.15;letter-spacing:-.035em;color:${c.text};max-width:25ch}
    ${root} .izify-gaara-home small{display:block;margin-top:9px;font-size:12px;line-height:1.5;color:${c.subtext}}
    ${root} .izify-gaara-home-seal{flex:none;width:clamp(58px,8vw,100px);height:100px;object-fit:contain;opacity:.85}
    ${root} .izify-gaara-home-palettes{display:flex;flex-wrap:wrap;gap:6px;margin-top:18px}
    ${root} .izify-gaara-home button{font:inherit;font-size:11px;font-weight:600;line-height:1.4;padding:6px 10px;background:${alpha(c.bg,.6)};color:${c.subtext};border:1px solid ${alpha(c.accent,.2)};border-radius:5px;cursor:pointer}
    ${root} .izify-gaara-home button[aria-pressed="true"],${root} .izify-gaara-home button:hover{background:${c.card};color:${c.text};border-color:${c.accent}}
    @media(max-width:700px){${root} .izify-gaara-home{gap:12px;padding:20px 18px}${root} .izify-gaara-home-seal{width:54px;height:64px}${root} .izify-gaara-home small{max-width:30ch}${root} .izify-gaara-tools{right:12px;bottom:12px}}
    @media(prefers-reduced-motion:reduce){${root} [data-izify-lyrics-track] > [data-testid="lyrics-line"]{transition:none!important}}
    `;
  };
  M.createGaaraHome=({getState,setPreference})=>{
    let observer=null,timer=null,banner=null,home=null,enabled=false;
    const remove=()=>{banner?.remove();banner=null;home=null;};
    function sync(){
      timer=null;if(!enabled)return;
      const next=document.querySelector('[data-testid="home-page"]');
      if(!next){remove();return;}
      if(home!==next||!banner?.isConnected){
        remove();home=next;banner=document.createElement('section');banner.className='izify-gaara-home';banner.setAttribute('aria-label','Gaara · Vila da Areia');
        const copy=document.createElement('div');copy.className='izify-gaara-home-copy';
        const kicker=document.createElement('span');kicker.className='izify-gaara-home-kicker';kicker.textContent='SUNAGAKURE / QUINTO KAZEKAGE';
        const title=document.createElement('strong');title.textContent='Sua música. Seu refúgio.';
        const subtitle=document.createElement('small');subtitle.textContent='Escolha a atmosfera da sua Vila da Areia.';
        const palettes=document.createElement('div');palettes.className='izify-gaara-home-palettes';palettes.setAttribute('role','group');palettes.setAttribute('aria-label','Atmosfera do Gaara');
        for(const [id,mood] of Object.entries(M.gaaraAtmospheres)){const button=document.createElement('button');button.type='button';button.textContent=mood.name;button.dataset.atmosphere=id;button.addEventListener('click',()=>setPreference('decor.gaaraAtmosphere',id));palettes.append(button);}
        copy.append(kicker,title,subtitle,palettes);
        const emblem=document.createElement('img');emblem.className='izify-gaara-home-seal';emblem.src=M.assetURL('gaaraSeal');emblem.alt='';emblem.setAttribute('aria-hidden','true');
        banner.append(copy,emblem);home.prepend(banner);
      }
      const state=getState();banner.querySelector('.izify-gaara-home-seal').hidden=!state.decor.gaaraSeal;
      for(const button of banner.querySelectorAll('[data-atmosphere]'))button.setAttribute('aria-pressed',String(button.dataset.atmosphere===state.decor.gaaraAtmosphere));
    }
    const schedule=()=>{if(enabled&&!timer)timer=setTimeout(sync,80);};
    function stop(){enabled=false;clearTimeout(timer);timer=null;observer?.disconnect();observer=null;remove();}
    return {apply(state){
      if(M.themeCharacter(state)!=='gaara'||!state.decor.gaaraHome||M.isLightMode?.()){stop();return;}
      if(!enabled){enabled=true;observer=new MutationObserver(records=>{if(records.some(r=>r.target.matches?.('[data-testid="home-page"]')||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches('[data-testid="home-page"],.izify-gaara-home')||n.querySelector('[data-testid="home-page"]')))))schedule();});observer.observe(document.body,{subtree:true,childList:true});}
      sync();
    },destroy:stop};
  };
})();
