/* Character markers follow Spotify's active lyric state; no second playback clock. */
(() => {
  'use strict';
  const M=window.__izifyModules ||= {};
  M.createLyricsDecoration=({getState=()=>window.izify?.state,setPreference=(p,v)=>window.izify?.set(p,v)}={})=>{
    const lineSelector='[data-testid="lyrics-line"]';
    let enabled=false,observer=null,timer=null,activeSelectors=[],dirty=true,character='';
    const panels=new Map();
    const scenes=new Map();
    function removeScene(scene){
      scene.tools.remove();scene.layer.remove();delete scene.frame.dataset.izifyLyricsFrame;delete scene.viewport.dataset.izifyLyricsViewport;
      for(const source of scene.sources)delete source.dataset.izifyLyricsScene;
    }
    function syncScenes(){
      // The artwork is a sibling of the scroll viewport, never part of its content.
      // CSS sizes it to the panel; scrolling needs no JS or background-position correction.
      const wanted=new Map();
      for(const source of document.querySelectorAll('[style*="--lyrics-color-background"]:not([data-testid="lyrics-npv-section"])')){
        let viewport=source;
        while(viewport&&viewport!==document.body&&!(viewport.scrollHeight>viewport.clientHeight&&/auto|scroll/.test(getComputedStyle(viewport).overflowY)))viewport=viewport.parentElement;
        if(!viewport||viewport===document.body||!viewport.parentElement)continue;
        if(!wanted.has(viewport))wanted.set(viewport,new Set());wanted.get(viewport).add(source);
      }
      for(const [viewport,scene] of scenes)if(!wanted.has(viewport)){removeScene(scene);scenes.delete(viewport);}
      for(const [viewport,sources] of wanted){
        let scene=scenes.get(viewport);
        if(!scene){
          const frame=viewport.parentElement,layer=document.createElement('div');layer.className='izify-lyrics-scene';layer.setAttribute('aria-hidden','true');
          frame.dataset.izifyLyricsFrame='';viewport.dataset.izifyLyricsViewport='';frame.prepend(layer);
          const tools=document.createElement('div');tools.className='izify-gaara-tools';
          const focus=document.createElement('button');focus.type='button';focus.className='izify-gaara-focus';focus.title='Destacar somente o verso que está tocando';
          focus.addEventListener('click',()=>setPreference('decor.gaaraFocus',!getState().decor.gaaraFocus));tools.append(focus);frame.append(tools);
          scene={frame,viewport,layer,tools,focus,sources:new Set()};scenes.set(viewport,scene);
        }
        const focused=getState()?.decor.gaaraFocus===true;scene.focus.setAttribute('aria-pressed',String(focused));
        const label=focused?'Sair do foco':'Foco nas letras';if(scene.focus.textContent!==label)scene.focus.textContent=label;
        for(const source of scene.sources)if(!sources.has(source))delete source.dataset.izifyLyricsScene;
        for(const source of sources)source.dataset.izifyLyricsScene='';scene.sources=sources;
      }
    }
    function discover(){
      activeSelectors=[];
      const walk=rules=>{for(const rule of rules){
        if(rule.selectorText&&rule.style?.color==='var(--lyrics-color-active)'&&!rule.selectorText.includes(':hover')&&rule.style.pointerEvents!=='none')activeSelectors.push(rule.selectorText);
        else if(rule.cssRules)walk(rule.cssRules);
      }};
      for(const sheet of document.styleSheets){if(sheet.ownerNode?.id?.startsWith('izify-'))continue;try{walk(sheet.cssRules);}catch{}}
      dirty=false;
    }
    const current=line=>line.getAttribute('aria-current')==='true'||line.dataset.active==='true'||activeSelectors.some(selector=>{try{return line.matches(selector);}catch{return false;}});
    function remove(panel){
      panel.marker.remove();panel.resize.disconnect();panel.observe.disconnect();delete panel.container.dataset.izifyLyricsTrack;
      for(const line of panel.lines)delete line.dataset.izifyLyricActive;
    }
    function update(){
      timer=null;if(!enabled)return;if(dirty)discover();
      if(character==='gaara'&&!M.isLightMode?.())syncScenes();
      else if(scenes.size){for(const scene of scenes.values())removeScene(scene);scenes.clear();}
      const groups=new Map();
      for(const line of document.querySelectorAll(lineSelector)){
        // Unsynchronised lyrics have no active line: they keep the styling without a marker.
        const container=line.parentElement;if(!container)continue;
        if(!groups.has(container))groups.set(container,[]);groups.get(container).push(line);
      }
      for(const [container,panel] of panels)if(!groups.has(container)){remove(panel);panels.delete(container);}
      for(const [container,lines] of groups){
        let panel=panels.get(container);
        if(!panel){
          const marker=document.createElement('img');marker.className='izify-lyrics-marker izify-lyrics-'+character;marker.src=M.characterAsset(character,'head');marker.alt='';marker.setAttribute('aria-hidden','true');marker.draggable=false;marker.hidden=true;
          container.dataset.izifyLyricsTrack='';container.append(marker);
          const resize=new ResizeObserver(()=>{panel.geometryDirty=true;schedule();});resize.observe(container);
          const observe=new MutationObserver(records=>{if(records.some(record=>record.target.matches?.(lineSelector)))schedule();});
          observe.observe(container,{subtree:true,attributes:true,attributeFilter:['class','aria-current','data-active']});
          panel={container,marker,resize,observe,lines:[],active:null,geometryDirty:true};panels.set(container,panel);
        }
        for(const line of panel.lines)if(!lines.includes(line))delete line.dataset.izifyLyricActive;
        panel.lines=lines;
        const active=lines.find(current);
        if(panel.active===active&&!panel.geometryDirty)continue;
        panel.geometryDirty=false;
        if(panel.active!==active){if(panel.active)delete panel.active.dataset.izifyLyricActive;if(active)active.dataset.izifyLyricActive='';}
        const rect=active?.getBoundingClientRect();
        if(!rect?.height){panel.marker.hidden=true;panel.active=null;continue;}
        const origin=container.getBoundingClientRect(),size=Math.max(24,Math.min(42,parseFloat(getComputedStyle(active).fontSize)||32));
        if(panel.size!==size){panel.marker.style.width=size+'px';panel.marker.style.height=size+'px';panel.size=size;}
        const y=rect.top-origin.top+container.scrollTop+(Math.min(rect.height,parseFloat(getComputedStyle(active).lineHeight)||rect.height)-size)/2;
        // First appearance has no fly-in from the top; subsequent lines glide together.
        panel.marker.dataset.moving=panel.active?'true':'false';
        panel.marker.style.transform=`translate3d(0,${y}px,0)`;panel.marker.hidden=false;panel.active=active;
      }
    }
    function schedule(){if(enabled&&!document.hidden&&!timer)timer=setTimeout(update,80);}
    function stop(){
      enabled=false;clearTimeout(timer);timer=null;observer?.disconnect();observer=null;
      document.removeEventListener('visibilitychange',schedule);
      for(const scene of scenes.values())removeScene(scene);scenes.clear();
      for(const panel of panels.values())remove(panel);panels.clear();
    }
    return {
      apply(state){
        const next=M.themeCharacter(state);
        if(!next){stop();character='';return;}
        if(next!==character){stop();character=next;}
        if(!enabled){
          enabled=true;dirty=true;
          document.addEventListener('visibilitychange',schedule);
          observer=new MutationObserver(records=>{
            if(records.some(record=>record.target.matches?.('style,link')||record.target.parentElement?.matches('style')||[...record.addedNodes,...record.removedNodes].some(n=>n.nodeType===1&&n.matches('style,link'))))dirty=true;
            if(dirty||records.some(record=>record.target.matches?.(lineSelector)||record.type==='childList'&&[...record.addedNodes,...record.removedNodes].some(n=>n.nodeType===1&&(n.matches(lineSelector)||n.querySelector(lineSelector)))))schedule();
          });
          observer.observe(document.body,{subtree:true,childList:true});
          // Lazy lyrics styles may arrive after opening the page.
          observer.observe(document.head,{subtree:true,childList:true,characterData:true});
        }
        schedule();
      },
      destroy:stop,
    };
  };
})();
