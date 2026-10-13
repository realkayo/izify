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
  const logs = M.createLogs(), log = logs.scoped("izify"), storage = M.createStorage(log);
  let extras;
  const plugins = M.createPlugins({ logs, storage, getIzify: () => window.izify, changed: () => extras?.renderPlugins() });

  /* ----------------------------- CONFIG ---------------------------------- */
  const CFG = {
    discord: 'https://discord.gg/SEU-CONVITE', // <-- troque pelo seu convite
    version: '2.2.0',
    storageKey: 'izify:config:v2',
    welcomeKey: 'izify:welcome-dismissed',
    loadTimeout: 30000, // tempo máx. esperando o Spotify carregar
    settleDelay: 300,  // espera extra depois de carregado
  };

  const PRESETS = {
    spotify: { name: 'Spotify', accent: '#1ed760', bg: '#000000', panel: '#121212', card: '#1f1f1f', text: '#ffffff', subtext: '#b3b3b3' },
    izify:   { name: 'Izify',   accent: '#a78bfa', bg: '#0b0714', panel: '#140d24', card: '#1d1333', text: '#f5f3ff', subtext: '#a89bc9' },
    oceano:  { name: 'Oceano',  accent: '#38bdf8', bg: '#020b14', panel: '#08182a', card: '#0e2540', text: '#e8f4ff', subtext: '#8fb0cc' },
    sunset:  { name: 'Sunset',  accent: '#fb923c', bg: '#14070a', panel: '#200d12', card: '#2e1219', text: '#fff1ea', subtext: '#d1a08e' },
    rosa:    { name: 'Rosa',    accent: '#f472b6', bg: '#12060d', panel: '#1d0b15', card: '#2b1121', text: '#ffeef7', subtext: '#cf9bb6' },
    amoled:  { name: 'AMOLED',  accent: '#1ed760', bg: '#000000', panel: '#000000', card: '#0d0d0d', text: '#ffffff', subtext: '#9a9a9a' },
    claro:   { name: 'Claro',   accent: '#1db954', bg: '#e4e4e4', panel: '#ffffff', card: '#f2f2f2', text: '#121212', subtext: '#5e5e5e' },
  };
  const colorsOf = (k) => { const { name, ...c } = PRESETS[k]; return c; };

  const DEFAULTS = {
    preset: 'spotify',
    colors: colorsOf('spotify'),
    areas: { sidebar: '', topbar: '', player: '', progress: '' }, // '' = automático
    bg: {
      image: '', blur: 0, dim: 35, brightness: 100, saturate: 100,
      fit: 'cover', position: 'center', panelOpacity: 100, glass: 0,
      gradient: false, g1: '#1ed760', g2: '#121212', gAngle: 160,
    },
    style: { radius: 8, cardRadius: 8, gap: 8, font: '', letterSpacing: 0, noAnim: false },
    hide: { premium: true, history: false, scrollbars: false, selectors: '' },
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
  const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(...A.map((v, i) => v + (B[i] - v) * t)); };
  const rgba = (h, a) => { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const lum = (h) => {
    const [r, g, b] = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const onColor = (h) => (lum(h) > 0.45 ? '#000000' : '#ffffff');

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

  const get = (p) => p.split('.').reduce((o, k) => (o ? o[k] : undefined), state);
  const set = (p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], state)[last] = v; };

  let saveTimer;
  function save() {
    try { localStorage.setItem(CFG.storageKey, JSON.stringify(state)); }
    catch (e) { toast('Não deu pra salvar (imagem muito grande?)'); }
  }
  let themeFrame;
  function commit() { if (!themeFrame) themeFrame = requestAnimationFrame(() => { themeFrame = null; if (!dead) { applyTheme(); applyHides(); } }); clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); extras?.syncFont(); }

  /* ------------------------------ THEME ---------------------------------- */
  function styleTag(id) {
    let s = document.getElementById(id);
    if (!s) { s = document.createElement('style'); s.id = id; (document.head || document.documentElement).appendChild(s); }
    return s;
  }

  function validSel(x) {
    try { document.createDocumentFragment().querySelector(x); return true; } catch (e) { return false; }
  }

  function buildCSS(s) {
    const c = s.colors, a = s.areas, b = s.bg, st = s.style, h = s.hide;
    const hasImg = !!b.image;
    const hasGrad = !!b.gradient && !hasImg;
    const hasBg = hasImg || hasGrad;
    const op = hasBg ? b.panelOpacity / 100 : 1;
    const wo = (col) => (op < 1 ? rgba(col, op) : col);
    const font = (st.font || '').replace(/["\\;{}]/g, '').trim();

    const vars = {
      '--background-base': wo(c.panel),
      '--background-highlight': wo(mix(c.panel, c.text, 0.08)),
      '--background-press': wo(mix(c.panel, c.bg, 0.5)),
      '--background-elevated-base': c.card,
      '--background-elevated-highlight': mix(c.card, c.text, 0.08),
      '--background-elevated-press': mix(c.card, c.bg, 0.5),
      '--background-tinted-base': rgba(c.text, 0.1),
      '--background-tinted-highlight': rgba(c.text, 0.14),
      '--background-tinted-press': rgba(c.text, 0.07),
      '--text-base': c.text,
      '--text-subdued': c.subtext,
      '--text-bright-accent': c.accent,
      '--essential-base': c.text,
      '--essential-subdued': mix(c.subtext, c.panel, 0.45),
      '--essential-bright-accent': c.accent,
      '--decorative-base': c.text,
      '--decorative-subdued': mix(c.subtext, c.panel, 0.45),
    };
    const decl = Object.entries(vars).map(([k, v]) => `${k}:${v} !important;`).join('');

    // fundo (imagem ou gradiente)
    const img = (b.image || '').replace(/"/g, '%22');
    const dim = b.dim / 100;
    const dimLayer = `linear-gradient(rgba(0,0,0,${dim}),rgba(0,0,0,${dim}))`;
    const size = b.fit === 'tile' ? 'auto' : b.fit;
    const repeat = b.fit === 'tile' ? 'repeat' : 'no-repeat';
    const layers = hasImg ? `${dimLayer}, url("${img}")` : `${dimLayer}, linear-gradient(${b.gAngle}deg, ${b.g1}, ${b.g2})`;
    const sizing = hasImg ? `background-size:auto, ${size}; background-position:center, ${b.position}; background-repeat:no-repeat, ${repeat};` : '';
    const filt = `blur(${b.blur}px) brightness(${b.brightness}%) saturate(${b.saturate}%)`;

    // áreas com cor própria
    const area = (sel, col) => (col ? `${sel}{--background-base:${wo(col)} !important;background-color:${wo(col)} !important;}` : '');
    const progress = a.progress
      ? `.playback-progressbar, .progress-bar, [data-testid="progress-bar"]{--fg-color:${a.progress} !important;--progress-bar-active-color:${a.progress} !important;}
         .x-progressBar-fillColor{background-color:${a.progress} !important;}`
      : '';

    // esconder
    const hideList = (h.selectors || '').split('\n').map((x) => x.trim()).filter((x) => x && !/[{}]/.test(x) && validSel(x));

    return `
:root, body, .encore-dark-theme, .encore-light-theme,
.encore-dark-theme .encore-base-set, .encore-dark-theme.encore-base-set { ${decl} }

/* botões / elementos "accent set" do Spotify */
.encore-bright-accent-set, .encore-dark-theme .encore-bright-accent-set, .encore-dark-theme.encore-bright-accent-set {
  --background-base:${c.accent} !important;
  --background-highlight:${mix(c.accent, '#ffffff', 0.12)} !important;
  --background-press:${mix(c.accent, '#000000', 0.25)} !important;
  --text-base:${onColor(c.accent)} !important;
}

html, body { background-color:${c.bg} !important; }
${hasBg ? '.Root, .Root__top-container, #main { background:transparent !important; }' : ''}
body::before {
  content:''; position:fixed; inset:0; z-index:-1; pointer-events:none;
  ${hasBg ? `background-image:${layers}; ${sizing} filter:${filt}; ${b.blur > 0 ? 'transform:scale(1.06);' : ''}` : 'display:none;'}
}
${b.glass > 0 ? `.Root__main-view, .Root__nav-bar, .Root__right-sidebar, .Root__now-playing-bar { -webkit-backdrop-filter:blur(${b.glass}px) !important; backdrop-filter:blur(${b.glass}px) !important; }` : ''}

/* áreas */
${area('.Root__nav-bar', a.sidebar)}
${area('.Root__now-playing-bar', a.player)}
${a.topbar ? `.main-topBar-background{background-color:${wo(a.topbar)} !important;}` : ''}
${progress}

/* formato */
.Root__main-view, .Root__nav-bar, .Root__right-sidebar, .main-view-container { border-radius:${st.radius}px !important; }
.main-card-card, .main-card-imageContainer, .main-cardImage-imageWrapper { border-radius:${st.cardRadius}px !important; }
${st.gap !== 8 ? `.Root__top-container { gap:${st.gap}px !important; }` : ''}
${font ? `body, button, input, .encore-text, [class*="encore-text"] { font-family:"${font}", var(--encore-body-font-stack, sans-serif) !important; }` : ''}
${st.letterSpacing ? `body { letter-spacing:${st.letterSpacing}px; }` : ''}
${st.noAnim ? '*, *::before, *::after { transition:none !important; animation:none !important; }' : ''}

/* esconder */
${h.premium ? `.main-topBar-UpgradeButton, [data-testid="upgrade-button"], .main-topBar-container a[href*="/premium"],
[role="menu"] a[href*="/premium"], [role="menuitem"]:has(a[href*="/premium"]), [role="menu"] li:has(a[href*="/premium"]),
[role="menu"] li:has(> button[data-testid*="upgrade"]) { display:none !important; visibility:hidden !important; }` : ''}
${h.history ? '.main-topBar-historyButtons { display:none !important; }' : ''}
${h.scrollbars ? '::-webkit-scrollbar, .os-scrollbar, .os-scrollbar-vertical, .os-scrollbar-horizontal { display:none !important; width:0 !important; }' : ''}
${hideList.length ? hideList.join(',\n') + ' { display:none !important; }' : ''}
`;
  }

  function applyTheme() {
    styleTag('izify-theme').textContent = buildCSS(state);
    styleTag('izify-custom').textContent = state.css || '';
    const a = state.colors.accent;
    document.documentElement.style.setProperty('--izify-accent', a);
    if (host) {
      host.style.setProperty('--iz-accent', a);
      host.style.setProperty('--iz-on-accent', onColor(a));
    }
  }

  /* --------------------------- CSS DA UI (light DOM) --------------------- */
  styleTag('izify-ui').textContent = `
#izify-btn{-webkit-app-region:no-drag;flex:none;width:32px;height:32px;padding:0;margin:0 8px 0 4px;border:0;border-radius:50%;
  background:rgba(0,0,0,.7);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
  transition:transform .12s ease,background .15s ease}
#izify-btn:hover{transform:scale(1.07);background:#1f1f1f}
#izify-btn svg{width:18px;height:18px;fill:currentColor}
#izify-btn[data-open="true"]{background:var(--izify-accent,#1ed760);color:#000}
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
  let observer = null, onDown = null, onEsc = null, welcomeKey = null, dead = false, stopPick = null;

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
  <span class="sw"><i style="background:${p.bg}"></i><i style="background:${p.panel}"></i><i style="background:${p.accent}"></i></span>${p.name}
</button>`).join('');

    panel = el(`
<div class="panel" id="panel" role="dialog" aria-label="Izify">
  <div class="ph"><div class="pt"><pre class="ascii-mini" aria-hidden="true">${escHtml(assets.logo)}</pre>Izify</div><button class="x" id="px" aria-label="Fechar">${svg(I.close)}</button></div>
  <div class="tabs">
    <button class="tab on" data-t="cores">Cores</button>
    <button class="tab" data-t="fundo">Fundo</button>
    <button class="tab" data-t="estilo">Estilo</button>
    <button class="tab" data-t="esconder">Esconder</button>
    <button class="tab" data-t="plugins">Plugins</button>
    <button class="tab" data-t="dev">Dev</button>
    <button class="tab" data-t="avancado">Avançado</button>
  </div>
  <div class="body">
    <section data-tab="cores" class="on">
      <div class="h">Temas</div>
      <div class="presets">${presetsHtml}</div>
      <div class="h">Cores</div>
      ${colorRow('colors.accent', 'Destaque')}
      ${colorRow('colors.bg', 'Fundo (atrás dos painéis)')}
      ${colorRow('colors.panel', 'Painéis')}
      ${colorRow('colors.card', 'Cartões e menus')}
      ${colorRow('colors.text', 'Texto')}
      ${colorRow('colors.subtext', 'Texto secundário')}
      <div class="h">Áreas (opcional)</div>
      <div class="hint">Cor própria por área. O × volta ao automático.</div>
      ${areaRow('areas.sidebar', 'Barra lateral')}
      ${areaRow('areas.topbar', 'Barra superior')}
      ${areaRow('areas.player', 'Barra do player')}
      ${areaRow('areas.progress', 'Barra de progresso')}
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
    </section>

    <section data-tab="estilo">
      <div class="h">Formato</div>
      ${rangeRow('style.radius', 'Arredondar painéis', 0, 32, 'px')}
      ${rangeRow('style.cardRadius', 'Arredondar cartões', 0, 32, 'px')}
      ${rangeRow('style.gap', 'Espaço entre painéis', 0, 24, 'px')}
      <div class="h">Texto</div>
      ${M.panelSections.fonts}
      ${rangeRow('style.letterSpacing', 'Espaçamento das letras', -1, 4, 'px', 0.1)}
      <div class="h">Efeitos</div>
      ${chkRow('style.noAnim', 'Desativar animações e transições')}
    </section>

    <section data-tab="esconder">
      <div class="h">Elementos do Spotify</div>
      ${chkRow('hide.premium', 'Esconder "Upgrade to Premium" / "Explorar Premium"')}
      ${chkRow('hide.history', 'Esconder botões voltar / avançar')}
      ${chkRow('hide.scrollbars', 'Esconder barras de rolagem')}
      <div class="h">Seletor de elementos</div>
      <div class="acts"><button class="btn ghost sm" id="pick">Escolher elemento na tela</button></div>
      <div class="hint">O painel fecha: clique no que quer esconder. Esc cancela.</div>
      <div class="h">Seletores escondidos (um por linha)</div>
      <textarea data-path="hide.selectors" spellcheck="false" placeholder=".exemplo-de-classe&#10;[data-testid=&quot;algo&quot;]"></textarea>
      <div class="hint">Apague uma linha para mostrar o elemento de volta.</div>
    </section>

    <section data-tab="plugins">${M.panelSections.plugins}</section>
    <section data-tab="dev">${M.panelSections.dev}</section>
    <section data-tab="avancado">
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
    <span class="hint">Izify · v${CFG.version}</span>
  </div>
</div>`);
    layer.appendChild(panel);

    const q = (s) => panel.querySelector(s);

    /* abas */
    panel.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
      panel.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
      panel.querySelectorAll('section').forEach((s) => s.classList.toggle('on', s.dataset.tab === t.dataset.t));
      panel.querySelector(".body").scrollTop = 0; extras?.activate(t.dataset.t);
    }));

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
      state.preset = b.dataset.preset;
      state.colors = colorsOf(b.dataset.preset);
      syncControls(); commit();
    }));

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
    q('#pick').addEventListener('click', startPicker);
    renderProfiles();

    extras = M.createPanelExtras({ panel, logs, plugins, storage, assets, toast, getState: () => state, setFont: (font) => { state.style.font = font; commit(); }, isOpen: () => panelOpen });
    syncControls();
  }

  function syncControls() {
    if (!shadow) return;
    const active = shadow.activeElement;
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
    const u = shadow.querySelector('#bgUrl');
    if (u && u !== active) u.value = state.bg.image.startsWith('data:') ? '' : state.bg.image;
    const st = shadow.querySelector('#bgState');
    if (st) st.textContent = state.bg.image ? (state.bg.image.startsWith('data:') ? 'Imagem local aplicada.' : 'Imagem por URL aplicada.') : 'Nenhuma imagem de fundo.';
  }

  function setBg(url) {
    state.bg.image = url;
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

  function openPanel(page) { if (!panel) buildPanel(); panelOpen = true; panel.classList.add('open'); if (btn) btn.dataset.open = 'true'; if (typeof page === 'string') panel.querySelector('[data-t="' + page.replace(/[^a-z]/g, '') + '"]').click(); extras?.renderLogs(); }
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

  /* ------------------------------ ESCONDER ELEMENTOS --------------------- */
  function selectorFor(node) {
    const esc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : v.replace(/[^\w-]/g, '\\$&'));
    const stable = (c) => !/-sc-/.test(c) && /[-_]/.test(c);
    const parts = [];
    let n = node;
    for (let depth = 0; n && n.nodeType === 1 && n !== document.body && depth < 7; depth++, n = n.parentElement) {
      let p = n.tagName.toLowerCase();
      const tid = n.getAttribute('data-testid');
      const cls = [...n.classList].filter(stable).slice(0, 2);
      if (tid) p += '[data-testid="' + tid.replace(/"/g, '\\"') + '"]';
      else if (n.id && !/\d{3,}/.test(n.id)) p = '#' + esc(n.id);
      else if (cls.length) p += cls.map((x) => '.' + esc(x)).join('');
      else if (n.parentElement) p += ':nth-child(' + (Array.prototype.indexOf.call(n.parentElement.children, n) + 1) + ')';
      parts.unshift(p);
      const sel = parts.join(' > ');
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch (e) { /* ignore */ }
    }
    return parts.join(' > ');
  }

  function addHide(sel) {
    const cur = (state.hide.selectors || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (!cur.includes(sel)) cur.push(sel);
    state.hide.selectors = cur.join('\n');
    syncControls(); commit();
  }

  function startPicker() {
    ensureHost();
    closePanel();
    const box = el('<div class="pickbox"></div>');
    const tip = el('<div class="picktip">Clique no elemento para esconder · Esc cancela</div>');
    layer.append(box, tip);
    let cur = null;
    const inUi = (e) => e.composedPath().includes(host) || e.composedPath().includes(btn);

    const move = (e) => {
      if (inUi(e)) return;
      const t = e.target;
      if (!t || t === document.documentElement || t === document.body) return;
      cur = t;
      const r = t.getBoundingClientRect();
      Object.assign(box.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    };
    const block = (e) => { if (inUi(e)) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
    const click = (e) => {
      if (inUi(e)) return;
      block(e);
      if (cur) { addHide(selectorFor(cur)); toast('Elemento escondido'); }
      stop();
    };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); stop(); } };

    function stop(silent) {
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('mousedown', block, true);
      document.removeEventListener('mouseup', block, true);
      document.removeEventListener('pointerdown', block, true);
      document.removeEventListener('keydown', key, true);
      box.remove(); tip.remove();
      stopPick = null;
      if (silent !== true && !dead) openPanel();
    }
    stopPick = stop;
    document.addEventListener('mousemove', move, true);
    document.addEventListener('click', click, true);
    document.addEventListener('mousedown', block, true);
    document.addEventListener('mouseup', block, true);
    document.addEventListener('pointerdown', block, true);
    document.addEventListener('keydown', key, true);
  }

  // ---- "Upgrade to Premium": remoção instantânea e permanente ----
  // O MutationObserver roda como microtask, ANTES do navegador pintar o frame:
  // o item é removido no mesmo instante em que o Spotify o cria (sem piscar).
  const PREMIUM_SEL =
    '[role="menuitem"], [role="menu"] li, [role="menu"] a, .main-topBar-container a, .main-topBar-container button, ' +
    '.main-topBar-UpgradeButton, [data-testid="upgrade-button"]';
  let purgeObs = null;

  function purgeNode(n) {
    if (!n || n.nodeType !== 1 || n.closest('#izify-btn')) return;
    const txt = n.textContent || '';
    if (txt.length > 60) return; // evita pegar contêineres grandes
    const href = n.getAttribute('href') || '';
    const hit = /premium/i.test(txt) || /\/premium/i.test(href) ||
      n.matches('.main-topBar-UpgradeButton, [data-testid="upgrade-button"]');
    if (!hit) return;
    if (n.closest('[role="menu"]')) {
      // menus são efêmeros (o Spotify desmonta o menu inteiro ao fechar): dá pra remover do DOM de vez
      (n.closest('li') || n).remove();
    } else {
      // na topbar o nó pertence ao React: escondido por CSS + display:none (remover poderia quebrar o render)
      n.style.setProperty('display', 'none', 'important');
      n.setAttribute('data-iz-hidden', '1');
    }
  }

  function scanPremium(root) {
    if (!state.hide.premium || !root || root.nodeType !== 1) return;
    if (root.matches(PREMIUM_SEL)) purgeNode(root);
    root.querySelectorAll(PREMIUM_SEL).forEach(purgeNode);
  }

  function startPurge() {
    if (purgeObs || !document.documentElement) return;
    purgeObs = new MutationObserver((muts) => {
      if (!state.hide.premium) return;
      for (const m of muts) for (const n of m.addedNodes) scanPremium(n);
    });
    purgeObs.observe(document.documentElement, { childList: true, subtree: true });
    scanPremium(document.body);
  }

  // Rede de segurança (chamada no commit e no observer lento da topbar)
  function applyHides() {
    document.querySelectorAll('[data-iz-hidden]').forEach((n) => {
      if (!state.hide.premium) { n.style.removeProperty('display'); n.removeAttribute('data-iz-hidden'); }
    });
    if (state.hide.premium) scanPremium(document.body);
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
    if (!document.body) return;
    if (!btn) {
      btn = el(`<button id="izify-btn" title="Izify — Personalizar" aria-label="Izify">${svg(I.palette)}</button>`);
      btn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
      btn.dataset.open = 'false';
    }
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

  function watchTopbar() {
    let t;
    observer = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { mountButton(); applyHides(); }, 200); });
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
    extras?.destroy();
    await plugins.destroy();
    await storage.close();
    logs.destroy();
    clearTimeout(saveTimer);
    save();
    if (observer) observer.disconnect();
    if (purgeObs) { purgeObs.disconnect(); purgeObs = null; }
    if (onDown) document.removeEventListener('mousedown', onDown, true);
    if (onEsc) document.removeEventListener('keydown', onEsc);
    if (welcomeKey) document.removeEventListener('keydown', welcomeKey, true);
    if (stopPick) stopPick(true);
    document.querySelectorAll('[data-iz-hidden]').forEach((n) => { n.style.removeProperty('display'); n.removeAttribute('data-iz-hidden'); });
    if (btn) btn.remove();
    if (host) host.remove();
    ['izify-theme', 'izify-custom', 'izify-ui'].forEach((id) => { const n = document.getElementById(id); if (n) n.remove(); });
    document.documentElement.style.removeProperty('--izify-accent');
    delete window.izify;
    window.__izify = null;
  }

  /* ------------------------------ INIT ----------------------------------- */
  const spotifyReady = () =>
    document.readyState !== 'loading' && document.body &&
    document.querySelector('.Root__top-container, #main') &&
    document.querySelector('[data-testid="user-widget-link"], .main-topBar-container, [data-testid="top-bar-back-button"]');

  const ready = (async function init() {
    applyTheme(); // aplica o tema cedo, evita "flash" do tema original
    startPurge(); // começa a eliminar o "Upgrade to Premium" desde o primeiro render

    const ok = await waitFor(spotifyReady, CFG.loadTimeout);
    if (!ok) console.warn('[Izify] Spotify demorou pra carregar — seguindo mesmo assim (botão flutuante).');
    await sleep(CFG.settleDelay);
    if (dead) return;

    ensureHost();
    buildPanel();
    mountButton();
    applyHides();
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
    open: openPanel, close: closePanel, welcome: showWelcome, destroy, ready, logs, plugins,
    set: (path, value) => { if (get(path) === undefined) throw new Error("Preferência desconhecida"); set(path, value); syncControls(); commit(); },
    run: (code) => runUserJS(code),
    reset: () => { state = clone(DEFAULTS); syncControls(); commit(); },
    get state() { return clone(state); },
  };
  window.__izify = window.izify;
})();
