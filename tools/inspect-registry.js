(async()=>{
  const context=window.__izifyInspection,{registry}=context;
  const list=registry._map instanceof Map?[...registry._map]:Object.entries(registry._map||{});
  const out=[];
  for(const[key,registration]of list){
    const name=String(key);
    if(!/Symbol\((PlayerAPI|StandalonePlayerCoordinatorAPI|ProductStateAPI|UserAPI|Cosmos)\)/.test(name))continue;
    const object=registration.instance; if(!object)continue;
    const methods=Object.getOwnPropertyNames(Object.getPrototypeOf(object));
    out.push({name,own:Object.getOwnPropertyNames(object),proto:methods,fields:Object.entries(object).filter(([k,v])=>v&&typeof v==='object'&&/player|state|service|transport|api/i.test(k)).map(([k,v])=>({key:k,own:Object.getOwnPropertyNames(v).slice(0,40),proto:Object.getOwnPropertyNames(Object.getPrototypeOf(v)).slice(0,40)})),
      code:methods.filter(k=>/getState|subscribe|state|resume|load|ad/i.test(k)&&typeof object[k]==='function').map(k=>({key:k,code:String(object[k]).slice(0,1800)}))});
    context[name.slice(7,-1)]=object;
  }
  const settingsClass=Object.values(context.req(81418)).find(v=>v?.SERVICE_ID?.endsWith('.Settings'));
  context.settingsClient=new settingsClass(context.rpc);
  try{
    const settings=await context.settingsClient.getSlotSettings({slotId:'stream'});context.streamSettings=settings;
    out.push({name:'streamSettings',keys:Object.keys(settings),types:Object.entries(settings).map(([k,v])=>({key:k,type:typeof v,keys:v&&typeof v==='object'?Object.keys(v):null,enabled:typeof v==='boolean'?v:null}))});
  }catch(e){out.push({name:'streamSettings',error:e.message})}
  return out;
})()
