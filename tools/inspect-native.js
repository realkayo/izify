(async()=>{
  const context=window.__izifyInspection,{req,registry,managers}=context;
  const shape=o=>({own:Object.getOwnPropertyNames(o||{}),proto:Object.getOwnPropertyNames(Object.getPrototypeOf(o||{}))});
  const module=req(10608);let rpc,resolveError;
  try{rpc=await registry.resolve(module.VI)}catch(e){resolveError=e.message}
  const core=managers.inStreamApi?.adsCoreConnector;
  context.rpc=rpc;context.adsCore=core;
  const entries=registry._map instanceof Map?[...registry._map.entries()]:Object.entries(registry._map||{});
  const describe=key=>typeof key==='symbol'?String(key):typeof key==='function'?key.name:String(key);
  const result={native:{send:typeof window.executeEsperantoCall,cancel:typeof window.cancelEsperantoCall},rpc:shape(rpc),resolveError,
    registryEntries:entries.map(([k,v])=>({key:describe(k),type:typeof v,...shape(v)})).filter(x=>/player|ads|esperanto|user|product|cosmos|transport/i.test(x.key)),
    core:shape(core),coreFields:Object.keys(core||{}).map(k=>({key:k,type:typeof core[k],...shape(core[k])})),
    coreMethods:Object.getOwnPropertyNames(Object.getPrototypeOf(core||{})).filter(k=>k!=='constructor').map(k=>({name:k,source:typeof core[k]==='function'?String(core[k]).slice(0,2200):null})),
    audioApi:shape(managers.audio?.audioApi),inStreamApi:shape(managers.inStreamApi),
    methods:[]};
  const services=Object.values(req(81418)).filter(v=>typeof v==='function'&&v.SERVICE_ID);
  result.methods=services.filter(v=>/Slots|Settings|State|InStream|Ads$/.test(v.SERVICE_ID)).map(v=>({service:v.SERVICE_ID,methods:v.METHODS}));
  if(rpc&&typeof rpc.callSingle==='function'){
    const C=services.find(v=>/\.Slots$/.test(v.SERVICE_ID));const client=new C(rpc);context.slotsClient=client;
    try{const data=await client.getSlots();result.slotData=data;}catch(e){result.slotError=e.message}
  }
  return result;
})()
