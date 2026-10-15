/* Opt-in rendering budget. Never trims the OS working set or forces garbage collection. */
(() => {
  const M=window.__izifyModules ||= {};
  M.createPerformance=({storage,onChange})=>{
    let mode=storage.read('izify:performance:v1',{}).mode==='light'?'light':'normal',closed=false,observer=null,timer=null;
    const pausedVideos=new Set();let requested=new WeakSet();
    const light=()=>mode==='light';M.isLightMode=light;
    const style=document.createElement('style');style.id='izify-performance';
    function trimDecorativeMedia(){
      timer=null;if(!light()||closed)return;
      for(const video of document.querySelectorAll('video')){
        if(video.muted&&video.loop&&!video.paused){pausedVideos.add(video);video.dataset.izifyDecorativeVideo='';video.pause();}
      }
      for(const video of pausedVideos)if(!video.isConnected){pausedVideos.delete(video);delete video.dataset.izifyDecorativeVideo;}
      // Ask Spotify to use its own audio variant. Never pause the primary media element.
      for(const button of document.querySelectorAll('button')){
        const label=(button.getAttribute('aria-label')||button.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
        if(/^(switch to audio|mudar para audio|alternar para audio|passer a l.audio|cambiar a audio)$/i.test(label)&&!button.disabled&&!requested.has(button)){requested.add(button);button.click();}
      }
    }
    const schedule=()=>{if(light()&&!timer)timer=setTimeout(trimDecorativeMedia,250);};
    const onPlay=event=>{if(event.target.tagName==='VIDEO')schedule();};
    function stopMedia(){
      clearTimeout(timer);timer=null;observer?.disconnect();observer=null;document.removeEventListener('play',onPlay,true);
      requested=new WeakSet();
      for(const video of pausedVideos){delete video.dataset.izifyDecorativeVideo;if(video.isConnected&&video.paused)try{Promise.resolve(video.play()).catch(()=>{});}catch{}}pausedVideos.clear();
    }
    function apply(){
      if(light()){
        document.documentElement.dataset.izifyLight='';
        style.textContent='html[data-izify-light] *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;animation:none!important;transition:none!important;scroll-behavior:auto!important}#izify-background,.izify-lyrics-scene{background-image:none!important;filter:none!important}[data-izify-decorative-video]{display:none!important}';
        if(!style.isConnected)document.head.append(style);
        if(!observer){observer=new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(n=>n.nodeType===1&&(n.matches('video,button')||n.querySelector('video,button')))))schedule();});observer.observe(document.body,{subtree:true,childList:true});document.addEventListener('play',onPlay,true);}
        trimDecorativeMedia();
      }else{delete document.documentElement.dataset.izifyLight;style.remove();stopMedia();}
    }
    apply();
    const api=Object.freeze({getState:()=>({mode}),setMode(value){
      if(closed)throw new Error('Izify encerrado.');
      if(!['normal','light'].includes(value))throw new Error('Modo de desempenho inválido.');
      if(mode===value)return;mode=value;storage.write('izify:performance:v1',{mode});apply();onChange?.();
    }});
    return {api,destroy(){closed=true;stopMedia();style.remove();delete document.documentElement.dataset.izifyLight;if(M.isLightMode===light)delete M.isLightMode;}};
  };
  M.performanceTheme=state=>M.isLightMode?.()?{...state,bg:{...state.bg,image:'',blur:0,glass:0,gradient:false,pattern:'none'},style:{...state.style,shadows:false,noAnim:true}}:state;
})();
