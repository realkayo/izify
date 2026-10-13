(() => {
  const key=Object.keys(window).find(k=>/^(rspack|webpack)Chunk/.test(k));let req;
  if(key)window[key].push([[Symbol()],{},r=>{req=r}]);
  const out={hidden:document.hidden,ready:document.readyState,status:window.izifyAds?.status(),
    globals:Object.keys(window).filter(k=>/cosmos|spotify|spicetify|platform|esperanto|player/i.test(k)).slice(0,30),
    reqKeys:req?Object.getOwnPropertyNames(req):[],cacheSize:Object.keys(req?.c||{}).length,moduleCount:Object.keys(req?.m||{}).length,
    widget:document.querySelector('[data-testid="now-playing-widget"]')?.textContent.slice(0,120)};
  window.__izifyInspection ||= {};window.__izifyInspection.req=req;
  return out;
})()
