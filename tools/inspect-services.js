(async()=>{
  const {req,platforms}=window.__izifyInspection;
  const shape=obj=>({own:Object.getOwnPropertyNames(obj||{}).slice(0,100),proto:Object.getOwnPropertyNames(Object.getPrototypeOf(obj||{})).slice(0,80)});
  const pl=platforms[0];const out={platformKeys:Object.getOwnPropertyNames(pl),transport:null,registry:null,adManagers:null,modules:[]};
  const transport=await pl.getTransport?.();const registry=await pl.getRegistry?.();const managers=await pl.getAdManagers?.();
  Object.assign(window.__izifyInspection,{transport,registry,managers});
  out.transport=shape(transport);out.registry=shape(registry);out.adManagers=managers?Object.entries(managers).map(([key,v])=>({key,...shape(v)})):null;
  out.platformMethods=Object.keys(pl).filter(k=>/user|product|player|ads|transport|cosmos/i.test(k)).map(k=>({key:k,type:typeof pl[k],body:typeof pl[k]==='function'?String(pl[k]).slice(0,900):null}));
  if(registry){out.registryEntries=Object.keys(registry).filter(k=>/transport|player|ads|user|product|cosmos|esperanto/i.test(k)).map(k=>({key:k,type:typeof registry[k],...shape(registry[k])}));}
  for(const id of ['10608','81418']){
    const ex=req(id);out.modules.push({id,source:String(req.m[id]).slice(0,id==='10608'?12000:0),exports:Object.entries(ex).map(([key,v])=>({key,type:typeof v,service:v?.SERVICE_ID,prototype:Object.getOwnPropertyNames(v?.prototype||{}),methods:v?.METHODS?Object.keys(v.METHODS):null}))});
  }
  const search=['LIST_PLAYER_NO_LIST','_getTrackPlayer','new ','getRegistry','putOverridesValues','delOverridesValues','ProductStateAPI','getUserAPI','getPlayerAPI','player._','settingsClient'];
  out.factoryHits=search.map(term=>({term,matches:Object.entries(req.m).flatMap(([id,factory])=>{const s=String(factory),at=s.indexOf(term);return at<0?[]:[{id,length:s.length,excerpt:s.slice(Math.max(0,at-150),at+650)}];}).slice(0,term==='new '?0:8)}));
  return out;
})()
