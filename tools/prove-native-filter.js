(async()=>{
  await window.izifyAds?.ready;
  const {rpc,req,PlayerAPI,slotsClient}=window.__izifyInspection;
  if(!window.izifyAds?.status().filtroNativo)throw new Error('O filtro nativo não está instalado.');
  const before=PlayerAPI.getState();const pausedBefore=before.isPaused,positionBefore=before.positionAsOfTimestamp;
  const C=Object.values(req(81418)).find(v=>v?.SERVICE_ID?.endsWith('.Ads'));
  const original=rpc._onSend;let sent=0;
  rpc._onSend=function(packet){
    try{const data=new DataView(packet.request),length=data.getInt32(0),service=new TextDecoder().decode(new Uint8Array(packet.request,4,length));if(service===C.SERVICE_ID)sent++;}catch{}
    return original.apply(this,arguments);
  };
  let inventory;
  try{inventory=await new C(rpc).getAds({slotId:'stream'});}finally{rpc._onSend=original;}
  const after=PlayerAPI.getState();const slots=await slotsClient.getSlots();
  if(sent!==0||Object.keys(inventory.adPackage||{}).length)throw new Error('Uma solicitação de anúncio atravessou o filtro.');
  if(after.isPaused!==pausedBefore||after.positionAsOfTimestamp!==positionBefore)throw new Error('A reprodução mudou durante o teste.');
  return {nativeAdsRequestsSent:sent,inventoryPackages:Object.keys(inventory.adPackage||{}).length,
    pausedPreserved:after.isPaused===pausedBefore,positionPreserved:after.positionAsOfTimestamp===positionBefore,
    activeSlots:slots.adSlots?.filter(s=>s.hasActiveAd).map(s=>s.slotId),status:window.izifyAds.status()};
})()
