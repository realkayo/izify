/* ==========================================================================
   IZIFY — UI + personalização para o Spotify Desktop
   - Espera o Spotify carregar
   - Mostra tela de boas-vindas (estilo Spotify) com link do Discord + OK
   - Adiciona um botão na topbar que abre o menu de personalização
   - Tudo é salvo em localStorage e aplicado em tempo real
   ========================================================================== */
(() => {
  'use strict';
  const M = window.__izifyModules, assets = window.__izifyAssets;
  if (!M?.createPlugins || !assets?.css) throw new Error("Execute run.ps1 para carregar o pacote Izify.");
  if (!M.themePresets || !M.createPersonalization) throw new Error('Reinicie o runner ou atualize a instalação para carregar os novos temas do Izify.');
  const logs = M.createLogs(), log = logs.scoped("izify"), storage = M.createStorage(log);
  let extras, themeEngine;
  const performanceControl=M.createPerformance({storage,onChange:()=>{applyTheme();const input=panel?.querySelector('#performanceMode');if(input)input.value=performanceControl.api.getState().mode;}});
  const plugins = M.createPlugins({ logs, storage, getIzify: () => window.izify, changed: () => extras?.renderPlugins() });

  /* ----------------------------- CONFIG ---------------------------------- */
  const CFG = {
    discord: 'https://discord.gg/SEU-CONVITE', // <-- troque pelo seu convite
    version: '2.4.0',
    storageKey: 'izify:config:v2',
    welcomeKey: 'izify:welcome-dismissed',
    loadTimeout: 30000, // tempo máx. esperando o Spotify carregar
    settleDelay: 300,  // espera extra depois de carregado
  };

  const PRESETS = M.themePresets;
  const colorsOf = k => JSON.parse(JSON.stringify(PRESETS[k].colors));

  const DEFAULTS = {
    preset: 'spotify',
    colors: colorsOf('spotify'),
    areas: { ...M.themeDefaults.areas },
    bg: { ...M.themeDefaults.bg },
    style: { ...M.themeDefaults.style },
    decor: { ...M.themeDefaults.decor },
    css: '',
    js: { code: '', autorun: false },
  };

  /* ----------------------------- HELPERS --------------------------------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const merge = (a, b) => {
    for (const k of Object.keys(b || {})) {
      if (["__proto__", "constructor", "prototype"].includes(k)) continue;
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  const isHex = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
  const normHex = (v) => (v.length === 4 ? '#' + [...v.slice(1)].map((c) => c + c).join('') : v).toLowerCase();
  const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = (h) => {
    const [r, g, b] = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const onColor = (h) => (lum(h) > 0.179 ? '#121212' : '#ffffff');

  function waitFor(cond, timeout, step = 250) {
    return new Promise((res) => {
      const t0 = Date.now();
      (function tick() {
        let ok = false;
        try { ok = cond(); } catch (e) { /* ignore */ }
        if (ok) return res(true);
        if (Date.now() - t0 > timeout) return res(false);
        setTimeout(tick, step);
      })();
    });
  }

  /* ------------------------------ STATE ---------------------------------- */
  let state;
  try { state = merge(clone(DEFAULTS), JSON.parse(localStorage.getItem(CFG.storageKey) || localStorage.getItem('izify:config:v1')) || {}); }
  catch (e) { state = clone(DEFAULTS); }
  function migratePreferences() {
    M.normalizeTheme(state);
    if (typeof state.css !== 'string') state.css = '';
    if (!state.js || typeof state.js !== 'object' || Array.isArray(state.js)) state.js = { code:'',autorun:false };
    if (typeof state.js.code !== 'string') state.js.code = '';
    state.js.autorun = state.js.autorun === true;
    // Retired controls must not keep hiding artwork or changing Spotify geometry.
    delete state.hide;
    for (const key of ['radius', 'cardRadius', 'gap']) delete state.style[key];
  }
  migratePreferences();

  const get = (p) => p.split('.').reduce((o, k) => (o ? o[k] : undefined), state);
  const set = (p, v) => {
    if(state.preset==='spotify' && /^(?:colors|areas|bg|style|decor)(?:\.|$)|^css$/.test(p))state.preset='custom';
    if(p==='colors.accent')for(const key of ['button','selection'])if(state.colors[key]===state.colors.accent)state.colors[key]=v;
    const ks=p.split('.'),last=ks.pop();ks.reduce((o,k)=>o[k],state)[last]=v;
    if(p==='decor.gaaraAtmosphere')M.applyGaaraAtmosphere?.(state,v);
    else if(p.startsWith('colors.')&&M.themeCharacter(state)==='gaara')state.decor.gaaraAtmosphere='custom';
  };

  let saveTimer;
  function save() {
    try { localStorage.setItem(CFG.storageKey, JSON.stringify(state)); }
    catch (e) { toast('Não deu pra salvar (imagem muito grande?)'); }
  }
  let themeFrame, themeTimer;
  function flushTheme(){cancelAnimationFrame(themeFrame);themeFrame=null;clearTimeout(themeTimer);themeTimer=null;if(!dead)applyTheme();}
  function commit() { migratePreferences(); if (!themeFrame&&!themeTimer) {themeFrame=requestAnimationFrame(flushTheme);themeTimer=setTimeout(flushTheme,80);} clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); extras?.syncFont(); }

  /* ------------------------------ THEME ---------------------------------- */
  function styleTag(id) {
    let s = document.getElementById(id);
    if (!s) { s = document.createElement('style'); s.id = id; (document.head || document.documentElement).appendChild(s); }
    return s;
  }

  function applyTheme() {
    themeEngine ||= M.createPersonalization({getState:()=>state,selectPreset:applyPreset,setPreference:(path,value)=>window.izify.set(path,value),reset:()=>window.izify.reset(),getButton:()=>btn,defaultIcon:()=>svg(I.palette),onError:error=>log.warn(error)});
    themeEngine.apply(state);
    if (host) {
      if(state.preset==='spotify'){host.style.removeProperty('--iz-accent');host.style.removeProperty('--iz-on-accent');}
      else{host.style.setProperty('--iz-accent',state.colors.accent);host.style.setProperty('--iz-on-accent',onColor(state.colors.accent));}
    }
  }

  /* --------------------------- CSS DA UI (light DOM) --------------------- */
  styleTag('izify-ui').textContent = `
#izify-btn{-webkit-app-region:no-drag;flex:none;width:32px;height:32px;padding:0;margin:0 8px 0 4px;border:0;border-radius:50%;
  background:var(--izify-control-bg,#ffffff14)!important;color:var(--izify-control-text,#b3b3b3)!important;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
  transition:transform .12s ease,background .15s ease}
#izify-btn:hover{transform:scale(1.07);background:var(--izify-control-hover,#ffffff26)!important;color:var(--izify-control-active,#fff)!important}
#izify-btn svg{width:18px;height:18px;fill:currentColor!important;color:inherit!important}
#izify-btn img{width:25px;height:25px;object-fit:contain;pointer-events:none}
#izify-btn[data-open="true"]{background:var(--izify-control-accent,#1ed760)!important;color:var(--izify-control-ink,#121212)!important}
#izify-btn.iz-floating{position:fixed;top:12px;right:190px;z-index:2147483646}
`;

  /* --------------------------- CSS DA UI (shadow DOM) -------------------- */
  const UI_CSS = window.__izifyAssets.css;
  /* ------------------------------ ÍCONES --------------------------------- */
  const I = {
    palette: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    star: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  };
  const svg = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg>`;

  /* ------------------------------ HOST (shadow) -------------------------- */
  let host, shadow, layer, panel, btn, panelOpen = false;
  let observer = null, onDown = null, onEsc = null, welcomeKey = null, dead = false;

  function ensureHost() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'izify-host';
    // IMPORTANTE: não usar -webkit-app-region aqui. O host cobre a tela toda e
    // bloquearia o arrastar da janela. O no-drag fica só no painel/modal/botão.
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${UI_CSS}</style><div id="layer"></div>`;
    layer = shadow.getElementById('layer');
    document.body.appendChild(host);
    applyTheme();
  }

  function toast(msg) {
    if (!layer) return;
    const t = el('<div class="toast"></div>'); t.textContent = msg;
    layer.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  /* ------------------------------ BOAS-VINDAS ---------------------------- */
  function showWelcome() {
    ensureHost();
    const ov = el(`
<div class="overlay" role="dialog" aria-modal="true" aria-label="Bem-vindo ao Izify">
  <div class="modal">
    <pre class="ascii-welcome" aria-label="Logo Izify">${escHtml(assets.logo)}</pre>
    <h1>Bem-vindo ao Izify</h1>
    <p class="lead">O seu Spotify, do seu jeito. O Izify foi carregado com sucesso.</p>
    <ul class="feat">
      <li>${svg(I.check)}<span>Cores, temas e fundo totalmente personalizáveis</span></li>
      <li>${svg(I.check)}<span>Procure o botão <b>paleta</b> na barra superior para abrir o menu</span></li>
      <li>${svg(I.check)}<span>Tudo é salvo automaticamente e aplicado na hora</span></li>
    </ul>
    <div class="btns">
      <button class="btn ghost" id="welcomeSettings">Personalizar</button>
      <button class="btn primary" id="ok">OK</button>
    </div>
    <label class="dont"><input type="checkbox" id="dont"> Não mostrar novamente</label>
  </div>
</div>`);
    layer.appendChild(ov);
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('show')));

    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.stopPropagation(); close(); } };
    function close() {
      if (ov.querySelector('#dont').checked) { try { localStorage.setItem(CFG.welcomeKey, '1'); } catch (e) { /* ignore */ } }
      ov.classList.remove('show');
      document.removeEventListener('keydown', onKey, true);
      welcomeKey = null;
      setTimeout(() => ov.remove(), 260);
    }
    ov.querySelector('#ok').addEventListener('click', close);
    ov.querySelector('#welcomeSettings').addEventListener('click', () => { close(); openPanel(); });
    document.addEventListener('keydown', onKey, true);
    welcomeKey = onKey;
    ov.querySelector('#ok').focus();
  }

  /* ------------------------------ PAINEL --------------------------------- */
  const colorRow = (path, label) => `
<div class="row"><label>${label}</label><div class="ctl">
  <input type="text" class="hex" data-path="${path}" data-kind="color" maxlength="7" spellcheck="false">
  <input type="color" data-path="${path}" data-kind="color">
</div></div>`;
  const rangeRow = (path, label, min, max, unit, step = 1) => `
<div class="row"><label>${label}</label><div class="ctl">
  <input type="range" min="${min}" max="${max}" step="${step}" data-path="${path}" data-type="num">
  <span class="out" data-out="${path}" data-unit="${unit}"></span>
</div></div>`;
  const areaRow = (path, label) => `
<div class="row"><label>${label}</label><div class="ctl">
  <input type="text" class="hex" data-path="${path}" data-kind="color" data-opt="1" maxlength="7" placeholder="auto" spellcheck="false">
  <input type="color" data-path="${path}" data-kind="color" data-opt="1">
  <button class="mini" data-clear="${path}" title="Voltar ao automático" aria-label="Automático">${svg(I.close)}</button>
</div></div>`;
  const chkRow = (path, label) => `<label class="chk"><input type="checkbox" data-path="${path}"> ${label}</label>`;
  const selRow = (path, label, opts) => `
<div class="row"><label>${label}</label><div class="ctl">
  <select data-path="${path}">${opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
</div></div>`;
  const FONTS = ['Segoe UI', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Consolas', 'Courier New', 'Comic Sans MS', 'Impact', 'Calibri', 'Cambria'];

  function buildPanel() {
    ensureHost();
    const presetsHtml = Object.entries(PRESETS).map(([k, p]) => `
<button class="preset" data-preset="${k}">
  <span class="sw"><i style="background:${p.colors.bg}"></i><i style="background:${p.colors.panel}"></i><i style="background:${p.colors.accent}"></i></span><strong class="preset-name">${p.name}${M.themeCharacters[k]?`<img class="preset-icon" src="${M.characterAsset(k,'icon')||M.characterAsset(k,'head')}" alt="" aria-hidden="true">`:''}</strong><small>${p.description}</small>
</button>`).join('');

    panel = el(`
<div class="panel" id="panel" role="dialog" aria-label="Izify">
  <div class="ph"><div class="pt"><pre class="ascii-mini" aria-hidden="true">${escHtml(assets.logo)}</pre>Izify</div><button class="x" id="px" aria-label="Fechar">${svg(I.close)}</button></div>
  <div class="tabs">
    <button class="tab on" data-t="cores">Cores</button>
    <button class="tab" data-t="fundo">Fundo</button>
    <button class="tab" data-t="estilo">Estilo</button>
    <button class="tab" data-t="plugins">Plugins</button>
    <button class="tab" data-t="dev" hidden>Dev</button>
    <button class="tab" data-t="avancado">Avançado</button>
  </div>
  <div class="body">
    <section data-tab="cores" class="on">
      <div class="h">Temas</div>
      <div class="theme-preview" id="themePreview" aria-label="Prévia das cores do tema"><div class="preview-cover" aria-hidden="true">♫</div><div class="preview-track"><strong>Seu Spotify, do seu jeito</strong><span id="themeCaption">Spotify</span><div class="preview-progress"><i></i></div></div><span class="preview-play" aria-hidden="true">▶</span></div>
      <div class="presets">${presetsHtml}</div>
      <p class="hint">Cada tema aplica cores, fundo e formato. Você pode ajustar tudo abaixo e salvar um perfil.</p>
      <div class="acts"><button class="btn ghost sm" id="themeImport">Importar color.ini</button><input id="themeFile" type="file" accept=".ini" hidden><select id="themeScheme" aria-label="Paleta importada" hidden></select></div>
      <div class="h">Cores</div>
      ${colorRow('colors.accent', 'Destaque')}
      ${colorRow('colors.bg', 'Fundo (atrás dos painéis)')}
      ${colorRow('colors.panel', 'Painéis')}
      ${colorRow('colors.card', 'Cartões e menus')}
      ${colorRow('colors.text', 'Texto')}
      ${colorRow('colors.subtext', 'Texto secundário')}
      <details class="theme-details"><summary>Mais cores</summary>
      ${colorRow('colors.button', 'Botões de destaque')}
      ${colorRow('colors.border', 'Bordas')}
      ${colorRow('colors.hover', 'Ao passar o mouse')}
      ${colorRow('colors.selection', 'Seleção')}
      ${colorRow('colors.tooltip', 'Dicas flutuantes')}
      ${colorRow('colors.scrollbar', 'Barra de rolagem')}
      ${colorRow('colors.shadow', 'Sombras')}
      </details>
      <details class="theme-details"><summary>Cores por área</summary>
      <div class="hint">Cor própria por área. O × volta ao automático.</div>
      ${areaRow('areas.sidebar', 'Barra lateral')}
      ${areaRow('areas.topbar', 'Barra superior')}
      ${areaRow('areas.main', 'Conteúdo principal')}
      ${areaRow('areas.rightbar', 'Painel da direita')}
      ${areaRow('areas.player', 'Barra do player')}
      ${areaRow('areas.progress', 'Barra de progresso')}
      ${areaRow('areas.volume', 'Barra de volume')}
      ${areaRow('areas.menus', 'Menus')}
      ${areaRow('areas.search', 'Busca')}
      </details>
      <div class="h">Meus perfis</div>
      <div class="acts"><input class="txt" id="profName" placeholder="Nome do perfil" maxlength="32" spellcheck="false"><button class="btn primary sm" id="profSave">Salvar</button></div>
      <div id="profList"></div>
    </section>

    <section data-tab="fundo">
      <div class="h">Imagem de fundo</div>
      <input class="txt" id="bgUrl" placeholder="Cole a URL de uma imagem (https://...)" spellcheck="false">
      <div class="acts">
        <button class="btn ghost sm" id="bgUpload">Escolher do computador</button>
        <button class="btn ghost sm" id="bgClear">Remover</button>
      </div>
      <input type="file" id="bgFile" accept="image/*" hidden>
      <div class="hint" id="bgState"></div>
      ${selRow('bg.fit', 'Ajuste', [['cover', 'Preencher'], ['contain', 'Conter'], ['tile', 'Repetir']])}
      ${selRow('bg.position', 'Posição', [['center', 'Centro'], ['top', 'Topo'], ['bottom', 'Base'], ['left', 'Esquerda'], ['right', 'Direita']])}
      <div class="h">Filtros</div>
      ${rangeRow('bg.blur', 'Desfoque', 0, 40, 'px')}
      ${rangeRow('bg.dim', 'Escurecer', 0, 90, '%')}
      ${rangeRow('bg.brightness', 'Brilho', 20, 150, '%')}
      ${rangeRow('bg.saturate', 'Saturação', 0, 200, '%')}
      <div class="h">Painéis</div>
      ${rangeRow('bg.panelOpacity', 'Opacidade', 20, 100, '%')}
      ${rangeRow('bg.glass', 'Vidro (blur)', 0, 40, 'px')}
      <div class="hint">Diminua a opacidade para o fundo aparecer; o vidro desfoca o que fica atrás dos painéis.</div>
      <div class="h">Gradiente (usado quando não há imagem)</div>
      ${chkRow('bg.gradient', 'Ativar gradiente')}
      ${colorRow('bg.g1', 'Cor inicial')}
      ${colorRow('bg.g2', 'Cor final')}
      ${rangeRow('bg.gAngle', 'Ângulo', 0, 360, '°')}
      <div class="h">Detalhes do fundo</div>
      ${selRow('bg.pattern', 'Estampa', [['none','Nenhuma'],['kuromi','Kuromi · caveiras e estrelas'],['stars','Estrelas'],['dots','Pontos']])}
      ${rangeRow('bg.patternOpacity', 'Intensidade', 0, 60, '%')}
      ${selRow('decor.wallpaper','Fundo especial',[['none','Nenhum'],['kuromi','Kuromi · preto'],['gaara','Gaara · pôr do sol']])}
    </section>

    <section data-tab="estilo">
      <div class="h">Texto</div>
      ${M.panelSections.fonts}
      ${rangeRow('style.letterSpacing', 'Espaçamento das letras', -1, 4, 'px', 0.1)}
      ${rangeRow('style.fontScale', 'Tamanho do texto', 85, 125, '%')}
      <div class="h">Formato e espaço</div>
      ${rangeRow('style.surfaceRadius', 'Cantos dos painéis', 0, 28, 'px')}
      ${rangeRow('style.cardRound', 'Cantos dos cartões', 0, 28, 'px')}
      ${rangeRow('style.coverRound', 'Cantos das capas', 0, 32, 'px')}
      ${rangeRow('style.buttonRound', 'Cantos dos botões', 0, 32, 'px')}
      ${rangeRow('style.gapSize', 'Espaço entre painéis', 0, 20, 'px')}
      ${rangeRow('style.rowHeight', 'Altura das faixas', 40, 80, 'px')}
      ${rangeRow('style.progressHeight', 'Espessura das barras', 2, 10, 'px')}
      <div class="h">Tema especial</div>
      ${selRow('decor.icon','Ícone do Izify',[['none','Paleta'],['kuromi','Cabeça da Kuromi'],['gaara','Gaara · selo 愛']])}
      ${selRow('decor.progressHandle','Marcador do progresso',[['none','Original'],['kuromi','Cabeça da Kuromi'],['gaara','Gaara · selo 愛']])}
      <div id="gaaraFeatures" class="gaara-options" hidden>
      <div class="h">Gaara · Arte da Areia</div>
      <p class="hint">Selo 愛, dunas e as noites de Sunagakure. O pequeno Kazekage acompanha sua música.</p>
      ${selRow('decor.gaaraAtmosphere','Atmosfera',[['dusk','Crepúsculo'],['dunes','Dunas'],['night','Suna à noite'],['custom','Suas cores']])}
      ${chkRow('decor.gaaraHome','Refúgio de Sunagakure na Home')}
      ${chkRow('decor.gaaraSand','Contornos de areia')}
      ${chkRow('decor.gaaraSeal','Símbolo 愛 nas letras e na Home')}
      ${chkRow('decor.gaaraFocus','Foco no verso que está tocando')}
      </div>
      <div class="h">Efeitos</div>
      ${chkRow('style.albumTint', 'Manter as cores da capa no cabeçalho')}
      ${chkRow('style.borders', 'Mostrar bordas nos painéis')}
      ${chkRow('style.shadows', 'Sombras suaves nos painéis')}
      ${chkRow('style.noAnim', 'Desativar animações e transições')}
    </section>

    <section data-tab="plugins">${M.panelSections.plugins}</section>
    <section data-tab="dev">${M.panelSections.dev}</section>
    <section data-tab="avancado">
      <div class="h">Desempenho</div>
      <label class="row"><span>Modo de renderização</span><select id="performanceMode"><option value="normal">Visual completo</option><option value="light">Leve</option></select></label>
      <p class="hint">Leve mantém a paleta e os ícones; desativa fundos decorativos, vidro, sombras e animações. Pausa vídeos decorativos e prefere áudio quando o Spotify oferece essa opção.</p>
      <div class="h">CSS personalizado</div>
      <textarea data-path="css" spellcheck="false" placeholder="/* seu CSS aqui */"></textarea>
      <div class="h">JavaScript personalizado</div>
      <textarea id="jsCode" data-path="js.code" spellcheck="false" placeholder="// seu JS aqui (Ctrl+Enter executa)&#10;// pode usar await e return"></textarea>
      <label class="chk"><input type="checkbox" data-path="js.autorun"> Executar automaticamente ao iniciar o Spotify</label>
      <div class="acts">
        <button class="btn primary sm" id="jsRun">Executar</button>
        <button class="btn ghost sm" id="jsClear">Limpar</button>
      </div>
      <div class="jsout" id="jsOut"></div>
      <div class="hint warn">Só execute código em que você confia: ele roda com acesso total ao Spotify.</div>
      <div class="h">Exportar / importar configuração</div>
      <textarea id="cfgJson" spellcheck="false" placeholder="Cole aqui uma configuração para importar"></textarea>
      <div class="acts">
        <button class="btn ghost sm" id="cfgCopy">Copiar atual</button>
        <button class="btn ghost sm" id="cfgImport">Importar</button>
      </div>
    </section>
  </div>
  <div class="pf">
    <button class="link" id="reset">Restaurar padrão</button>
    <button class="hint version" id="izifyVersion">Izify · v${CFG.version}</button>
  </div>
</div>`);
    layer.appendChild(panel);

    const q = (s) => panel.querySelector(s);
    q('#performanceMode').value=performanceControl.api.getState().mode;
    q('#performanceMode').addEventListener('change',e=>performanceControl.api.setMode(e.target.value));

    /* abas */
    panel.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
      if (t.dataset.t === 'dev' && !devUnlocked) return;
      panel.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
      panel.querySelectorAll('section').forEach((s) => s.classList.toggle('on', s.dataset.tab === t.dataset.t));
      panel.querySelector(".body").scrollTop = 0; extras?.activate(t.dataset.t);
    }));
    q('#izifyVersion').addEventListener('click', () => {
      if (devUnlocked || ++devClicks < 10) return;
      devUnlocked = true;
      q('[data-t="dev"]').hidden = false;
      toast('Modo Dev ativado');
    });

    /* inputs genéricos (data-path) */
    panel.addEventListener('input', (e) => {
      const t = e.target;
      const path = t.dataset && t.dataset.path;
      if (!path) return;
      let v = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.type === 'num') v = +v;
      if (t.dataset.kind === 'color' && !(t.dataset.opt && v === '')) {
        if (!isHex(v)) return;
        v = normHex(v);
      }
      set(path, v);
      if (path.startsWith('colors.')) state.preset = 'custom';
      if (path === 'bg.gradient' && v && state.bg.panelOpacity === 100) state.bg.panelOpacity = 70; // deixa o gradiente visível
      syncControls();
      commit();
    });

    /* presets */
    panel.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => {
      applyPreset(b.dataset.preset);
    }));
    let importedSchemes = {};
    const useScheme = () => { const scheme=importedSchemes[q('#themeScheme').value];if(!scheme)return;Object.assign(state.colors,scheme.colors);Object.assign(state.areas,scheme.areas);state.preset='custom';syncControls();commit();toast('Paleta aplicada. Ajuste o formato na aba Estilo.'); };
    q('#themeImport').addEventListener('click',()=>q('#themeFile').click());
    q('#themeFile').addEventListener('change',async e=>{
      const file=e.target.files[0];if(!file)return;
      try{
        if(file.size>128*1024)throw new Error('Escolha um color.ini de até 128 KB.');
        importedSchemes=M.parseThemeINI(await file.text());
        q('#themeScheme').replaceChildren(...Object.keys(importedSchemes).map(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;return option;}));
        q('#themeScheme').hidden=false;useScheme();
      }catch(error){toast(error.message);}finally{e.target.value='';}
    });
    q('#themeScheme').addEventListener('change',useScheme);

    /* fundo */
    q('#bgUrl').addEventListener('change', (e) => setBg(e.target.value.trim()));
    q('#bgClear').addEventListener('click', () => setBg(''));
    q('#bgUpload').addEventListener('click', () => q('#bgFile').click());
    q('#bgFile').addEventListener('change', (e) => { if (e.target.files[0]) loadImageFile(e.target.files[0]); e.target.value = ''; });

    /* avançado: JS */
    const jsBox = q('#jsCode');
    q('#jsRun').addEventListener('click', () => runUserJS(state.js.code));
    q('#jsClear').addEventListener('click', () => { state.js.code = ''; syncControls(); commit(); showJsOut('', ''); });
    jsBox.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runUserJS(state.js.code); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const a = jsBox.selectionStart, b = jsBox.selectionEnd;
        jsBox.setRangeText('  ', a, b, 'end');
        jsBox.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    /* avançado: config */
    q('#cfgCopy').addEventListener('click', async () => {
      const txt = JSON.stringify({
        ...state,
        bg: { ...state.bg, image: state.bg.image.startsWith('data:') ? '' : state.bg.image },
        js: { ...state.js, autorun: false },
      }, null, 2);
      q('#cfgJson').value = txt;
      try { await navigator.clipboard.writeText(txt); toast('Configuração copiada'); } catch (e) { toast('Copie manualmente do campo'); }
    });
    q('#cfgImport').addEventListener('click', () => {
      try {
        state = merge(clone(DEFAULTS), JSON.parse(q('#cfgJson').value));
        // segurança: JS importado nunca roda sozinho
        const hadJs = !!(state.js && state.js.code);
        state.js.autorun = false;
        syncControls(); commit();
        toast(hadJs ? 'Importado. O JS NÃO foi executado: revise antes de rodar' : 'Configuração importada');
      } catch (e) { toast('JSON inválido'); }
    });

    q('#reset').addEventListener('click', () => {
      state = clone(DEFAULTS);
      syncControls(); commit(); toast('Tudo restaurado');
    });
    q('#px').addEventListener('click', closePanel);

    /* áreas (×), perfis e seletor */
    panel.addEventListener('click', (e) => {
      const clr = e.target.closest('[data-clear]');
      if (clr) { set(clr.dataset.clear, ''); syncControls(); commit(); return; }
      const ld = e.target.closest('[data-pload]');
      if (ld) { applyProfile(ld.dataset.pload); return; }
      const dl = e.target.closest('[data-pdel]');
      if (dl) deleteProfile(dl.dataset.pdel);
    });
    q('#profSave').addEventListener('click', () => saveProfile(q('#profName').value));
    renderProfiles();

    extras = M.createPanelExtras({ panel, logs, plugins, storage, assets, toast, getState: () => state, setFont: (font) => { set('style.font',font);commit(); }, isOpen: () => panelOpen });
    syncControls();
  }

  function syncControls() {
    migratePreferences();
    if (!shadow) return;
    const active = shadow.activeElement;
    const gaaraFeatures=shadow.querySelector('#gaaraFeatures');if(gaaraFeatures)gaaraFeatures.hidden=M.themeCharacter(state)!=='gaara';
    shadow.querySelectorAll('[data-path]').forEach((n) => {
      if (n === active) return;
      if (n.type === 'checkbox') { n.checked = !!get(n.dataset.path); return; }
      let v = get(n.dataset.path);
      if (v === undefined) return;
      if (n.type === 'color' && !v) v = state.colors.panel; // área em "auto": mostra a cor do painel
      if (n.value !== String(v)) n.value = v;
    });
    shadow.querySelectorAll('[data-out]').forEach((n) => { n.textContent = get(n.dataset.out) + n.dataset.unit; });
    shadow.querySelectorAll('.preset').forEach((n) => n.classList.toggle('on', n.dataset.preset === state.preset));
    extras?.syncFont();
    const preview=shadow.querySelector('#themePreview');
    if(preview){
      preview.style.backgroundColor=state.colors.panel;preview.style.color=state.colors.text;preview.style.borderColor=state.colors.border;preview.style.borderRadius=state.style.surfaceRadius+'px';
      preview.querySelector('.preview-cover').style.background=state.colors.card;preview.querySelector('.preview-cover').style.color=state.colors.accent;preview.querySelector('.preview-cover').style.borderRadius=state.style.coverRound+'px';
      preview.querySelector('.preview-play').style.background=state.colors.button;preview.querySelector('.preview-play').style.color=onColor(state.colors.button);
      preview.querySelector('.preview-progress i').style.background=state.areas.progress||state.colors.accent;
      const caption=preview.querySelector('#themeCaption');caption.style.color=state.colors.subtext;caption.textContent=PRESETS[state.preset]?.name||'Seu tema personalizado';
    }
    const u = shadow.querySelector('#bgUrl');
    if (u && u !== active) u.value = state.bg.image.startsWith('data:') ? '' : state.bg.image;
    const st = shadow.querySelector('#bgState');
    if (st) st.textContent = state.bg.image ? (state.bg.image.startsWith('data:') ? 'Imagem local aplicada.' : 'Imagem por URL aplicada.') : 'Nenhuma imagem de fundo.';
  }

  function setBg(url) {
    set('bg.image',url);
    if (url && state.bg.panelOpacity === 100) state.bg.panelOpacity = 70; // deixa a imagem visível
    syncControls(); commit();
  }

  function loadImageFile(file) {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1920 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        setBg(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => toast('Imagem inválida');
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  let devClicks = 0, devUnlocked = false;
  function applyPreset(id) {
    const preset=PRESETS[id];if(!preset)throw new Error('Tema desconhecido.');
    state.preset=id;
    for(const key of ['colors','areas','bg','style','decor']) state[key]=clone(preset[key]);
    syncControls();commit();
  }
  function openPanel(page) {
    if (page === 'dev' && !devUnlocked) return;
    if (!panel) buildPanel(); panelOpen = true; panel.classList.add('open');
    if (btn) btn.dataset.open = 'true';
    if (typeof page === 'string') panel.querySelector('[data-t="' + page.replace(/[^a-z]/g, '') + '"]')?.click();
    extras?.renderLogs();
  }
  function closePanel() { panelOpen = false; if (panel) panel.classList.remove('open'); if (btn) btn.dataset.open = 'false'; }
  function togglePanel() { panelOpen ? closePanel() : openPanel(); }

  /* ------------------------------ PERFIS --------------------------------- */
  const PROF_KEY = 'izify:profiles:v1';
  const loadProfiles = () => { try { return JSON.parse(localStorage.getItem(PROF_KEY)) || {}; } catch (e) { return {}; } };
  const escHtml = (v) => String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function renderProfiles() {
    const box = shadow && shadow.querySelector('#profList');
    if (!box) return;
    const names = Object.keys(loadProfiles());
    box.innerHTML = names.length
      ? names.map((n) => `<div class="prof"><span title="${escHtml(n)}">${escHtml(n)}</span><span class="pa">
          <button class="btn ghost sm" data-pload="${escHtml(n)}">Aplicar</button>
          <button class="mini" data-pdel="${escHtml(n)}" aria-label="Excluir">${svg(I.close)}</button></span></div>`).join('')
      : '<div class="hint">Nenhum perfil salvo ainda.</div>';
  }

  function saveProfile(name) {
    name = (name || '').trim().slice(0, 32);
    if (!name) { toast('Dê um nome ao perfil'); return; }
    const { js, ...snap } = clone(state); // o JS personalizado nunca entra em perfis
    const all = loadProfiles();
    all[name] = snap;
    try { localStorage.setItem(PROF_KEY, JSON.stringify(all)); }
    catch (e) { toast('Sem espaço (imagem muito grande?)'); return; }
    renderProfiles(); toast('Perfil "' + name + '" salvo');
  }

  function applyProfile(name) {
    const snap = loadProfiles()[name];
    if (!snap) return;
    const keepJs = state.js;
    state = merge(clone(DEFAULTS), snap);
    state.js = keepJs;
    syncControls(); commit(); toast('Perfil "' + name + '" aplicado');
  }

  function deleteProfile(name) {
    const all = loadProfiles();
    delete all[name];
    try { localStorage.setItem(PROF_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
    renderProfiles();
  }

  /* ------------------------------ JS PERSONALIZADO ----------------------- */
  function showJsOut(text, kind) {
    const o = shadow && shadow.querySelector('#jsOut');
    if (!o) return;
    o.textContent = text;
    o.className = 'jsout' + (text ? ' show' : '') + (kind ? ' ' + kind : '');
  }

  async function runUserJS(code, silent) {
    code = (code || '').trim();
    if (!code) { if (!silent) showJsOut('Nada para executar.', ''); return; }
    try {
      let fn;
      try {
        // async para permitir await/return no código do usuário
        fn = new Function('izify', '"use strict";\nreturn (async () => {\n' + code + '\n})();');
      } catch (e) {
        if (e instanceof SyntaxError) throw e;
        throw new Error('O Spotify bloqueou eval/Function (CSP): ' + e.message);
      }
      const res = await fn(window.izify);
      log.ok('JavaScript personalizado executado');
      if (!silent) {
        let out = 'Executado com sucesso.';
        if (res !== undefined) {
          try { out += '\n→ ' + (typeof res === 'string' ? res : JSON.stringify(res, null, 2)); }
          catch (e) { out += '\n→ ' + String(res); }
        }
        showJsOut(out, 'ok');
      }
    } catch (e) {
      const msg = (e && e.stack) ? String(e.message || e) : String(e);
      log.error('JS personalizado:', e);
      if (silent) toast('Erro no JS ao iniciar: ' + msg.slice(0, 80));
      else showJsOut('Erro: ' + msg, 'err');
    }
  }

  /* ------------------------------ BOTÃO NA TOPBAR ------------------------ */
  function mountButton() {
    if (dead || !document.body) return;
    if (!btn) {
      btn = el(`<button id="izify-btn" title="Izify — Personalizar" aria-label="Izify">${svg(I.palette)}</button>`);
      btn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
      btn.dataset.open = 'false';
    }
    themeEngine?.syncButton(state);
    const user = document.querySelector('[data-testid="user-widget-link"]');
    const right = document.querySelector('.main-topBar-topbarContentRight');
    let parent = null, before = null;
    if (user && user.parentElement) { parent = user.parentElement; before = user; }
    else if (right) { parent = right; before = right.firstChild; }

    if (parent) {
      btn.classList.remove('iz-floating');
      if (btn.parentElement !== parent || btn.nextSibling !== before) parent.insertBefore(btn, before);
    } else if (!btn.isConnected || !btn.classList.contains('iz-floating')) {
      btn.classList.add('iz-floating');
      document.body.appendChild(btn); // fallback: botão flutuante no canto
    }
  }

  let topbarTimer;
  function watchTopbar() {
    observer = new MutationObserver(() => {
      if(btn?.isConnected&&!btn.classList.contains('iz-floating'))return;
      if(!topbarTimer)topbarTimer=setTimeout(()=>{topbarTimer=null;mountButton();},200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function bindGlobalEvents() {
    onDown = (e) => {
      if (!panelOpen) return;
      const path = e.composedPath();
      if (path.includes(btn) || path.includes(panel)) return;
      closePanel();
    };
    onEsc = (e) => { if (e.key === 'Escape' && panelOpen) closePanel(); if (e.ctrlKey && e.shiftKey && ['i', 'd'].includes(e.key.toLowerCase())) { e.preventDefault(); e.key.toLowerCase() === 'd' ? openPanel('dev') : togglePanel(); } };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onEsc);
  }

  /* ------------------------------ DESTROY (hot-reload) ------------------- */
  async function destroy() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(themeFrame);
    clearTimeout(themeTimer);
    clearTimeout(topbarTimer);
    performanceControl.destroy();
    themeEngine?.destroy();
    extras?.destroy();
    await plugins.destroy();
    await storage.close();
    logs.destroy();
    clearTimeout(saveTimer);
    save();
    if (observer) observer.disconnect();
    if (onDown) document.removeEventListener('mousedown', onDown, true);
    if (onEsc) document.removeEventListener('keydown', onEsc);
    if (welcomeKey) document.removeEventListener('keydown', welcomeKey, true);
    document.querySelectorAll('[data-iz-hidden]').forEach((n) => { n.style.removeProperty('display'); n.removeAttribute('data-iz-hidden'); });
    if (btn) btn.remove();
    if (host) host.remove();
    M.releaseAssets();
    ['izify-theme', 'izify-custom', 'izify-ui'].forEach((id) => { const n = document.getElementById(id); if (n) n.remove(); });
    document.documentElement.style.removeProperty('--izify-accent');
    delete window.izify;
    window.__izifyDownloadBridge?.dispose();
    window.__izify = null;
  }

  /* ------------------------------ INIT ----------------------------------- */
  const spotifyReady = () =>
    document.readyState !== 'loading' && document.body &&
    document.querySelector('.Root__top-container, #main') &&
    document.querySelector('[data-testid="user-widget-link"], .main-topBar-container, [data-testid="top-bar-back-button"]');

  const ready = (async function init() {
    applyTheme(); // aplica o tema cedo, evita "flash" do tema original
    migratePreferences(); save();

    const ok = await waitFor(spotifyReady, CFG.loadTimeout);
    if (!ok) console.warn('[Izify] Spotify demorou pra carregar — seguindo mesmo assim (botão flutuante).');
    await sleep(CFG.settleDelay);
    if (dead) return;

    ensureHost();
    buildPanel();
    mountButton();
    watchTopbar();
    bindGlobalEvents();
    for (const plugin of assets.builtins || []) await plugins.install(plugin.source, { builtin: true });
    await plugins.restore();

    if (state.js.autorun && state.js.code) runUserJS(state.js.code, true);

    let dismissed = false;
    try { dismissed = !!localStorage.getItem(CFG.welcomeKey); } catch (e) { /* ignore */ }
    if (!dismissed) showWelcome();

    log.ok('Izify carregado v' + CFG.version);
  })();

  // atalhos úteis pra debug no console
  window.izify = {
    open: openPanel, close: closePanel, welcome: showWelcome, destroy, ready, logs, plugins,performance:performanceControl.api,
    set: (path, value) => { if (get(path) === undefined) throw new Error("Preferência desconhecida"); set(path, value); syncControls(); commit(); },
    run: (code) => runUserJS(code),
    reset: () => { state = clone(DEFAULTS); syncControls(); commit(); },
    applyPreset,
    themeStatus: () => themeEngine?.status() || {native:true,adaptedRules:0,inaccessibleSheets:0,sheets:0,surfaces:{}},
    get personalization() { return themeEngine?.api; },
    get presets() { return clone(PRESETS); },
    get state() { return clone(state); },
  };
  window.__izify = window.izify;
})();
