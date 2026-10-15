/* Public personalization API and lifecycle. Palette generation stays in themes.js. */
(() => {
  'use strict';
  const M=window.__izifyModules ||= {};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const controlProperties=['bg','text','hover','active','accent','ink'];
  M.createPersonalization = ({getState,selectPreset,setPreference,reset,getButton,defaultIcon,onError}) => {
    let engine=null,closed=false;
    const lyrics=M.createLyricsDecoration({getState,setPreference}),gaaraHome=M.createGaaraHome({getState,setPreference});
    const listeners=new Set();
    const writable=fn=>(...args)=>{if(closed)throw new Error('A personalização foi encerrada. Obtenha a API do Izify atual.');return fn(...args);};
    const style=(id,text)=>{let node=document.getElementById(id);if(!node){node=document.createElement('style');node.id=id;document.head.append(node);}node.textContent=text;};
    function syncButton(state=getState()){
      const button=getButton();if(!button)return;
      const native=state.preset==='spotify',c=state.colors;
      const values={bg:c.card,text:c.text,hover:c.hover,active:c.accent,accent:c.accent,ink:M.themeOnColor(c.accent)};
      for(const key of controlProperties){const property='--izify-control-'+key;native?button.style.removeProperty(property):button.style.setProperty(property,values[key]);}
      const image=!native?(M.characterAsset(state.decor.icon,'icon')||M.characterAsset(state.decor.icon,'head')):null;
      const identity=image?state.decor.icon:'palette';
      if(button.dataset.izifyIcon!==identity){
        if(image){const icon=document.createElement('img');icon.src=image;icon.alt='';icon.setAttribute('aria-hidden','true');button.replaceChildren(icon);}
        else button.innerHTML=defaultIcon();
        button.dataset.izifyIcon=identity;
      }
    }
    function apply(state){
      if(closed)return;
      const character=M.themeCharacter(state);
      if(character)document.documentElement.dataset.izifyCharacter=character;else delete document.documentElement.dataset.izifyCharacter;
      gaaraHome.apply(state);
      lyrics.apply(state);
      if(state.preset==='spotify'){
        engine?.destroy();engine=null;
        for(const id of ['izify-theme','izify-custom'])document.getElementById(id)?.remove();
        document.documentElement.style.removeProperty('--izify-accent');
      }else{
        engine ||= M.createThemeEngine({onSelectorsChanged:()=>{if(!closed&&getState().preset!=='spotify')style('izify-theme',M.buildThemeCSS(M.performanceTheme(getState())));}});
        const visual=M.performanceTheme(state);
        engine.apply(visual);style('izify-theme',M.buildThemeCSS(visual));style('izify-custom',state.css||'');
        document.documentElement.style.setProperty('--izify-accent',state.colors.accent);
      }
      syncButton(state);
      for(const listener of listeners){try{listener(clone(state));}catch(error){onError?.(error);}}
    }
    const status=()=>engine?.status()||{native:true,adaptedRules:0,inaccessibleSheets:0,sheets:0,surfaces:{}};
    const api=Object.freeze({
      getState:()=>clone(getState()),
      listPresets:()=>Object.entries(M.themePresets).map(([id,preset])=>({id,name:preset.name,description:preset.description,special:preset.decor.icon!=='none'})),
      applyPreset:writable(id=>selectPreset(id)),
      set:writable((path,value)=>setPreference(path,value)),
      reset:writable(()=>reset()),
      getStatus:status,
      getAsset:name=>M.assetURL(name)||null,
      subscribe:writable(fn=>{if(typeof fn!=='function')throw new TypeError('Use uma função para acompanhar o tema.');listeners.add(fn);return()=>listeners.delete(fn);}),
    });
    return {api,apply,syncButton,status,destroy(){closed=true;listeners.clear();gaaraHome.destroy();lyrics.destroy();engine?.destroy();engine=null;delete document.documentElement.dataset.izifyCharacter;for(const id of ['izify-theme','izify-custom'])document.getElementById(id)?.remove();}};
  };
})();
