(async()=>{
  const c=window.__izifyInspection;
  const summary=()=>{const s=c.PlayerAPI?.getState();return {type:s?.item?.type||s?.item?.contentType,uri:s?.item?.uri?.split(':').slice(0,2).join(':'),paused:s?.isPaused,buffering:s?.isBuffering,position:s?.positionAsOfTimestamp,duration:s?.duration,adContext:!!s?.adBreakContext,widget:document.querySelector('[data-testid="now-playing-widget"]')?.getAttribute('aria-label')}};
  const before=summary();
  const slotBefore=await c.slotsClient.getSlots();
  c.blockSnapshot ||= {slotSettings:c.streamSettings,product:null};
  const actions=[];
  await c.settingsClient.updateSlotEnabled({slotId:'stream',enabled:false});actions.push('stream enabled=false');
  await c.slotsClient.clearAllAds({slotId:'stream'});actions.push('stream inventory cleared');
  const product=c.ProductStateAPI?.productStateApi;
  if(product){
    try{c.blockSnapshot.product=await product.getValues({keys:['ads']});await product.putOverridesValues({pairs:{ads:'0'}});actions.push('local ads override=0');}catch(e){actions.push('product override error: '+e.message)}
  }
  await new Promise(r=>setTimeout(r,2200));
  const slotAfter=await c.slotsClient.getSlots();
  return {before,after:summary(),actions,slotBefore:slotBefore.adSlots?.filter(s=>s.slotId==='stream'),slotAfter:slotAfter.adSlots?.filter(s=>s.slotId==='stream')};
})()
