(() => {
  const c=window.__izifyInspection,defs=c.req(81418);
  return {slotSettingFields:Object.keys(c.streamSettings?.slotSettings?.[0]||{}),slotSettingFlags:Object.entries(c.streamSettings?.slotSettings?.[0]||{}).filter(([,v])=>typeof v==='boolean'),
    productBeforeAds:c.blockSnapshot?.product?.pairs?.ads,
    enumCandidates:Object.entries(defs).filter(([,v])=>v&&typeof v==='object'&&Object.keys(v).some(k=>/clear|skip|disable|complete|playback|error|timeout/i.test(k))).map(([key,v])=>({key,values:v})),
    playerItemKeys:Object.keys(c.PlayerAPI?.getState()?.item||{}),adContextKeys:Object.keys(c.PlayerAPI?.getState()?.adBreakContext||{})};
})()
