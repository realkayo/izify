/* Addons for the original compact UI: no replacement layout. */
(() => {
  const M = window.__izifyModules ||= {};
  const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  M.panelSections = {
    fonts: `<div class="font-list" id="fontList" role="listbox" aria-label="Fontes"></div>
      <button class="btn ghost sm" id="fontReset">Padrão</button>`,
    plugins: `<div class="plugins-heading"><div><div class="h">Seus plugins</div><span class="hint" id="pluginCount"></span></div><button class="btn plugin-add sm" id="pluginPick"><span aria-hidden="true">+</span> Adicionar .js</button></div>
      <input id="pluginFile" type="file" accept=".js" hidden><p class="hint plugin-help">Importe um addon para personalizar seu Spotify. Você escolhe quando ativá-lo.</p><div id="pluginList"></div>`,
    dev: `<div class="h">Logs do Izify e plugins</div><div class="dev-controls"><select id="logLevel" aria-label="Nível dos logs"><option value="all">Todos os níveis</option>${['info','ok','warn','error','debug','net','dom'].map(v=>`<option value="${v}">${v}</option>`).join('')}</select><select id="logSource" aria-label="Origem dos logs"><option value="all">Todos os plugins</option></select></div>
      <input class="txt" id="logSearch" type="search" placeholder="Buscar nos logs…" aria-label="Buscar logs"><div class="dev-logs" id="devLogs" role="log" aria-label="Logs"></div>
      <div class="acts"><button class="btn ghost sm" id="logPause">Pausar</button><button class="btn ghost sm" id="logCopy">Copiar</button><button class="btn ghost sm" id="logExport">Exportar</button><button class="btn ghost sm" id="logClear">Limpar</button><button class="btn ghost sm" id="devExpand">Ampliar</button></div>
      <div class="h">Diagnóstico do adblock</div><div class="acts"><button class="btn ghost sm" id="adsStatus">Estado</button><button class="btn ghost sm" id="adsScan">Scan DOM</button><button class="btn ghost sm" id="runProbe">Probe</button></div>
      <p class="hint">Bloqueio no inventário e transporte nativo, sem cliques ou controle de reprodução.</p><pre class="dev-status" id="devStatus" hidden></pre>`,
  };
  M.createPanelExtras = ({panel,logs,plugins,storage,assets,toast,getState,setFont,isOpen}) => {
    const $ = selector => panel.querySelector(selector), listeners = [], measurements = new Map(), objectURLs = new Set();
    let destroyed = false, logTimer, paused = false, currentTab = 'cores';
    const on = (target,event,fn) => {
      const wrapped = async e => { try { await fn(e); } catch (err) { logs.write('izify','error',err); toast(err.message); } };
      target.addEventListener(event,wrapped); listeners.push(()=>target.removeEventListener(event,wrapped));
    };
    const fontName = name => String(name).replace(/["\\;{}<>\r\n]/g,'').trim().slice(0,100);
    function available(name) {
      if(measurements.has(name))return measurements.get(name);
      if([...document.fonts].some(f=>f.family.replace(/["']/g,'')===name)){measurements.set(name,true);return true;}
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),text='mmmmWWWW0123456789';
      const found=['serif','sans-serif','monospace'].some(f=>{ctx.font='48px '+f;const baseline=ctx.measureText(text).width;ctx.font=`48px "${fontName(name)}",${f}`;return Math.abs(ctx.measureText(text).width-baseline)>.01;});
      measurements.set(name,found);return found;
    }
    function renderFonts(){
      const current=getState().style.font;
      const fonts=[...new Set(['Segoe UI','Arial','Verdana','Tahoma','Trebuchet MS','Georgia','Times New Roman','Consolas','Courier New','Comic Sans MS','Impact','Calibri','Cambria','Cascadia Mono',...[...document.fonts].map(f=>f.family.replace(/["']/g,'')),...(current?[current]:[])])];
      $('#fontList').innerHTML=fonts.map(n=>`<button class="font-option" role="option" aria-selected="${n===current}" data-font="${escape(n)}" style="font-family:&quot;${escape(fontName(n))}&quot;,sans-serif" ${available(n)?'':'disabled'}><span>${escape(n)}</span>${available(n)?'':'<small>não instalada</small>'}</button>`).join('') || '<div class="hint">Nenhuma fonte encontrada.</div>';
    }
    function syncFont(){
      if(destroyed)return;
      const value=getState().style.font;
      for(const option of panel.querySelectorAll('.font-option'))option.setAttribute('aria-selected',String(option.dataset.font===value));
    }
    function chooseFont(name){name=fontName(name);if(name&&!available(name))return toast('Instale essa fonte no Windows antes de aplicar.');setFont(name);syncFont();renderFonts();}
    function renderPlugins(){
      if(destroyed)return;
      const labels={active:'Ativo',disabled:'Desativado',starting:'Iniciando…',stopping:'Parando…',error:'Erro'};
      const items=plugins.list();
      $('#pluginCount').textContent=`${items.length} instalado${items.length===1?'':'s'} · ${items.filter(p=>p.phase==='active').length} ativo${items.filter(p=>p.phase==='active').length===1?'':'s'}`;
      $('#pluginList').innerHTML=items.map(p=>`<article class="plugin-card ${p.phase==='active'?'is-active':''}"><div class="plugin-title"><span class="plugin-icon" aria-hidden="true">${p.builtin?'◇':'⌘'}</span><div class="plugin-name"><strong>${escape(p.name)}</strong><span class="plugin-meta">${escape(p.author)} <span>·</span> v${escape(p.version)}</span></div><span class="plugin-state ${p.phase}">${labels[p.phase]}</span></div><p>${escape(p.description)}</p>${p.error?`<p class="plugin-error">${escape(p.error)}</p>`:''}<div class="plugin-actions"><button class="plugin-remove" data-remove-plugin="${escape(p.id)}" aria-label="Excluir ${escape(p.name)}" ${['starting','stopping'].includes(p.phase)?'disabled':''}>Excluir</button><button class="plugin-toggle" role="switch" aria-label="Ativar ${escape(p.name)}" aria-checked="${p.phase==='active'}" data-plugin="${escape(p.id)}" data-enable="${p.phase!=='active'}" ${['starting','stopping'].includes(p.phase)?'disabled':''}><span></span></button></div></article>`).join('')||'<div class="plugin-empty">Nenhum plugin instalado.<p>Adicione um arquivo .js para começar.</p></div>';
      updateSources();
    }
    function updateSources(){
      const selected=$('#logSource').value,values=[...new Set([...logs.list().map(r=>r.source),...plugins.list().map(p=>p.id)])].sort();
      if([...$('#logSource').options].slice(1).map(o=>o.value).join('|')===values.join('|'))return;
      $('#logSource').innerHTML='<option value="all">Todos os plugins</option>'+values.map(s=>`<option value="${escape(s)}">${escape(s)}</option>`).join('');$('#logSource').value=values.includes(selected)?selected:'all';
    }
    const filtered=()=>{const level=$('#logLevel').value,source=$('#logSource').value,query=$('#logSearch').value.toLowerCase();return logs.list().filter(r=>(level==='all'||r.level===level)&&(source==='all'||r.source===source)&&(!query||(r.source+' '+r.msg).toLowerCase().includes(query)));};
    function renderLogs(){
      logTimer=null;if(destroyed||paused||currentTab!=='dev'||!isOpen())return;
      updateSources();const box=$('#devLogs'),sticky=box.scrollHeight-box.scrollTop-box.clientHeight<32,top=box.scrollTop;
      box.innerHTML=filtered().slice(-300).map(r=>`<div class="log-row ${escape(r.level)}"><time>${new Date(r.t).toLocaleTimeString('pt-BR',{hour12:false})}</time><b>${escape(r.level.toUpperCase())}</b><small>${escape(r.source)}</small><span>${escape(r.msg)}</span></div>`).join('')||'<p class="hint">Nenhum log com esse filtro.</p>';
      box.scrollTop=sticky?box.scrollHeight:top;
    }
    const unsubscribe=logs.subscribe(()=>{if(!logTimer&&isOpen()&&currentTab==='dev'&&!paused)logTimer=setTimeout(renderLogs,120);});
    function exportText(text){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));objectURLs.add(url);const a=document.createElement('a');a.href=url;a.download='izify-logs.txt';document.body.append(a);a.click();a.remove();}
    on($('#fontList'),'click',e=>{const option=e.target.closest('[data-font]');if(option&&!option.disabled)chooseFont(option.dataset.font);});
    on($('#fontReset'),'click',()=>chooseFont(''));
    on($('#pluginPick'),'click',()=>$('#pluginFile').click());
    on($('#pluginFile'),'change',async e=>{const file=e.target.files[0];if(!file)return;try{if(!/\.js$/i.test(file.name)||file.size>1024*1024)throw new Error('Escolha um arquivo .js de até 1 MB.');await plugins.install(await file.text(),{filename:file.name});toast('Plugin importado. Use Ativar para iniciar.');}finally{e.target.value='';}});
    on($('#pluginList'),'click',async e=>{const button=e.target.closest('button');if(!button||button.disabled)return;if(button.dataset.plugin)await plugins.enable(button.dataset.plugin,button.dataset.enable==='true');if(button.dataset.removePlugin)await plugins.remove(button.dataset.removePlugin);});
    for(const [selector,event] of [['#logLevel','change'],['#logSource','change'],['#logSearch','input']])on($(selector),event,renderLogs);
    on($('#logPause'),'click',()=>{paused=!paused;$('#logPause').textContent=paused?'Continuar':'Pausar';renderLogs();});
    on($('#logClear'),'click',()=>{logs.clear();$('#devLogs').replaceChildren();});
    on($('#logCopy'),'click',async()=>{try{await navigator.clipboard.writeText(logs.text(filtered()));toast('Logs copiados.');}catch{exportText(logs.text(filtered()));toast('Logs exportados.');}});
    on($('#logExport'),'click',()=>exportText(logs.text(filtered())));
    on($('#devExpand'),'click',()=>{const wide=panel.classList.toggle('dev-wide');$('#devExpand').textContent=wide?'Compactar':'Ampliar';});
    const status=value=>{const out=$('#devStatus');out.hidden=false;out.textContent=typeof value==='string'?value:JSON.stringify(value,null,2);};
    const adblock=()=>{if(!window.izifyAds)throw new Error('Ative o adblock na aba Plugins.');return window.izifyAds;};
    on($('#adsStatus'),'click',()=>{const value=adblock().status();status(value);logs.write('ad-block','debug',value);});
    on($('#adsScan'),'click',()=>adblock().scan());
    on($('#runProbe'),'click',async()=>{const value=await new Function('return '+assets.probe)();status(value);logs.write('probe','debug',value);});
    renderFonts();syncFont();renderPlugins();
    return {syncFont,renderPlugins,renderLogs,activate(tab){currentTab=tab;if(tab!=='dev'){panel.classList.remove('dev-wide');$('#devExpand').textContent='Ampliar';}if(tab==='estilo')renderFonts();renderLogs();},
      destroy(){destroyed=true;clearTimeout(logTimer);unsubscribe();listeners.forEach(fn=>fn());objectURLs.forEach(URL.revokeObjectURL);},};
  };
})();
