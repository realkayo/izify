(async () => {
  const channel = new MessageChannel();
  const yieldWork = () => new Promise(resolve => { channel.port1.onmessage = resolve; channel.port2.postMessage(0); });
  const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
  const names = obj => safe(() => Object.getOwnPropertyNames(obj || {}), []);
  const shape = obj => ({own:names(obj).slice(0,50),proto:names(Object.getPrototypeOf(obj || {})).slice(0,50)});
  const key = Object.keys(window).find(k=>/^(rspack|webpack)Chunk/.test(k));
  let req;
  if(key) window[key].push([[Symbol()],{},r=>{req=r}]);
  const output = {ad:window.izifyAds?.status(),modules:{key,definitions:names(req?.m).length,cache:names(req?.c).length},
    services:[],exports:[],platforms:[],media:[],widget:null};
  const roots=['#main','.Root','body'],seen=new Set();let visited=0;
  const platforms=[];
  const add=(value,where)=>{
    if(!value||typeof value!=='object'||platforms.includes(value))return;
    if(value.AdManagers||value.getAdManagers){platforms.push(value);output.platforms.push({where,...shape(value),
      user:shape(value.UserAPI),product:shape(value.UserAPI?._product_state||value.UserAPI?._product_state_service),
      platformTransport:shape(value.transport),managers: Object.entries(value.AdManagers||{}).map(([k,v])=>({key:k,...shape(v)}))});}
  };
  for(const selector of roots){
    const root=document.querySelector(selector),fiberKey=root&&names(root).find(k=>k.startsWith('__reactContainer$')||k.startsWith('__reactFiber$'));
    if(!fiberKey)continue;const stack=[root[fiberKey]];
    while(stack.length&&visited++<80000){
      if(visited%400===0)await yieldWork();
      const fiber=stack.pop();if(!fiber||seen.has(fiber))continue;seen.add(fiber);
      const props=fiber.memoizedProps;
      if(props&&typeof props==='object')for(const [k,v]of Object.entries(props).slice(0,30))add(v,'props.'+k);
      if(fiber.child)stack.push(fiber.child);if(fiber.sibling)stack.push(fiber.sibling);
    }
  }
  const cache=Object.entries(req?.c||{});
  for(const[id,module]of cache){
    const ex=module?.exports;
    for(const[k,value]of Object.entries(ex||{})){
      if(value?.SERVICE_ID&&/ads|player|product/i.test(value.SERVICE_ID))output.services.push({id,key:k,service:value.SERVICE_ID,prototype:names(value.prototype).slice(0,40),factory:safe(()=>String(value).slice(0,1100))});
      if(value&&typeof value==='object'&&(/transport|settings|player|cosmos|esperanto/i.test(k)||names(value).some(k=>/transport|callSingle|request|player/i.test(k))))
        if(output.exports.length<40)output.exports.push({id,key:k,...shape(value),transport:shape(value.transport)});
    }
  }
  const terms=['spotify.ads.esperanto','callSingle','LIST_PLAYER_NO_LIST','_loadedList','_getTrackPlayer','ads_enabled','adsEnabled','adBreak','AdBreak','setOverrides','putOverrides'];
  output.factories=[];
  for(const term of terms){const found=[];
    for(const[id,factory]of Object.entries(req?.m||{})){const text=safe(()=>String(factory),'');const at=text.indexOf(term);if(at>=0&&found.length<8)found.push({id,length:text.length,excerpt:text.slice(Math.max(0,at-160),at+350)});}
    output.factories.push({term,matches:found});await yieldWork();
  }
  output.media=[...document.querySelectorAll('audio,video')].map(n=>({tag:n.tagName,paused:n.paused,time:n.currentTime,duration:Number.isFinite(n.duration)?n.duration:null,source:safe(()=>new URL(n.currentSrc).protocol)}));
  const widget=document.querySelector('[data-testid="now-playing-widget"]');
  output.widget=widget?{text:widget.textContent.slice(0,150),aria:widget.getAttribute('aria-label'),attributes:names(widget).filter(k=>k.startsWith('__react'))}:null;
  // References stay in the renderer for follow-up inspection; no tokens/state bodies leave it.
  window.__izifyInspection={req,platforms};
  channel.port1.close(); channel.port2.close();
  return output;
})()
