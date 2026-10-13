/* @izify-plugin {"id":"ad-block","name":"Izify Adblock","description":"Filtro de anúncios da página, slots, player e diagnóstico do Spotify Desktop.","author":"Izify","version":"2.2.0"} */
izify.registerPlugin({ id: "ad-block", start(api) {
  'use strict';
  if (window.__izifyAds && typeof window.__izifyAds.destroy === 'function') {
    try { window.__izifyAds.destroy(); } catch (e) {}
  }

  const CFG = {
    poll: 400,
    endConfirm: 400,
    armFast: 1000,
    armSlow: 15000,
    armWait: 4000,
    log: true,
    notify: true,
    toastMs: 2500,
    blockNet: true,      // bloqueia requisições de anúncio feitas pela página (fetch/XHR)
  };

  const SEL = {
    widget: '[data-testid="now-playing-widget"]',
    title: '[data-testid="context-item-info-title"], [data-testid="context-item-link"]',
    next: '[data-testid="control-button-skip-forward"]',
    mute: '[data-testid="volume-bar-toggle-mute-button"]',
    volume: '[data-testid="volume-bar"] input[type="range"]',
  };

  const AD_WORDS = 'advertisements?|advertentie|an[uú]ncios?|publicidade|publicidad|werbung|publicit[eé]|pubblicit[aà]|annons|reklame|reklam';
  const AD_EXACT = new RegExp('^\\s*(?:' + AD_WORDS + ')\\s*$', 'i');
  const AD_RE = new RegExp('(?:' + AD_WORDS + ')', 'i');
  const MUTED_RE = /unmute|reativ|ativar som|activar som|restaur|r[eé]tablir|riattiva|stumm.*aus|ton an/i;

  const SERVICE = {
    ads: ['spotify.ads.esperanto.proto.Ads'],
    slots: ['spotify.ads.esperanto.slots.proto.Slots', 'spotify.ads.esperanto.proto.Slots'],
    settings: ['spotify.ads.esperanto.settings.proto.Settings', 'spotify.ads.esperanto.proto.Settings'],
  };

  const S = {
    req: null, platform: null, settings: null, slots: null, slotIds: [],
    registry: null, registryInstances: [], nativePlayer: null, productClient: null, adManagers: null, slotSnapshots: new Map(), disabledSlots: new Set(), rpcHook: null, nativeBlocked: 0,
    transport: false, transportSource: '', slotTransport: '', managerKeys: [], tries: 0, calls: {},
    hook: null, players: new Set(), patches: [], managers: new Set(),
    stateOk: 0, skips: 0, slotCalls: { ok: 0, fail: 0 }, errors: [], armed: 0,
    once: {}, errSeen: {}, slotSig: '', mgrSig: '',
  };

  let dead = false, armBusy = false, armTimer = null;
  let adActive = false, endTimer = null, armPromise = null, statePromise = null;
  let blocked = 0, leaked = 0, adStart = 0, toastEl = null, toastTimer = null;
  const startedWithAd = /advertisement|publicidade|anúncio/i.test(document.querySelector('[data-testid="now-playing-widget"]')?.getAttribute("aria-label") || "");

  const BUF = (window.__izifyAdsLog = window.__izifyAdsLog || []);
  const emit = (level, msg) => {
    const e = { t: Date.now(), level, msg };
    BUF.push(e);
    if (BUF.length > 300) BUF.shift();
    try { window.dispatchEvent(new CustomEvent('izify-ads-log', { detail: e })); } catch (err) {}
    if (!dead) api.log[level === 'err' ? 'error' : level]?.(msg);
  };
  const log = (...a) => emit('info', a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  const once = (key, level, msg) => {
    if (S.once[key]) return;
    S.once[key] = true;
    emit(level, msg);
  };
  const $ = (s) => document.querySelector(s);
  const note = (tag, e) => {
    const text = tag + ': ' + ((e && e.message) || e);
    S.errors.push(text);
    if (S.errors.length > 20) S.errors.shift();
    const n = (S.errSeen[text] = (S.errSeen[text] || 0) + 1);
    if (n <= 3 || n % 20 === 0) emit('err', text + (n > 1 ? ' (x' + n + ')' : ''));
  };
  const attempt = async (tag, fn) => {
    try { await fn(); return true; } catch (e) { note(tag, e); return false; }
  };

  function getReq() {
    const key = Object.keys(window).find((k) => /^(rspack|webpack)Chunk/.test(k));
    const chunk = key && window[key];
    if (!chunk || typeof chunk.push !== 'function') return null;
    let req = null;
    const ret = chunk.push([[Symbol()], {}, (r) => { req = r; return r; }]);
    req = req || ret;
    return typeof req === 'function' && req.m ? req : null;
  }

  const exportCache = new Map();
  const modCache = new Map(), incompatibleSlots = new WeakSet(), incompatibleConstructors = new Set();
  async function modulesWith(...terms) {
    const k = terms.join('|');
    if (modCache.has(k)) return modCache.get(k);
    const out = [];
    let checked = 0;
    for (const id of Object.keys(S.req.m)) {
      if (dead) break;
      if (checked++ % 150 === 0) await api.yield();
      try {
        const src = Function.prototype.toString.call(S.req.m[id]);
        if (terms.every((t) => src.includes(t))) out.push(id);
      } catch (e) {}
    }
    if (out.length) modCache.set(k, out);
    return out;
  }

  function loadModule(id) {
    try { const exports = S.req(id); exportCache.set(id, exports); return exports; } catch (e) { return null; }
  }

  const cachedExports = () => [...new Set([...exportCache.values(), ...Object.values(S.req.c || {}).map(m => m?.exports)].filter(Boolean))];

  async function findService(names) {
    const test = (v) => { try { return typeof v === 'function' && names.includes(v.SERVICE_ID); } catch (e) { return false; } };
    const scan = (ex) => {
      if (test(ex)) return ex;
      if (ex && (typeof ex === 'object' || typeof ex === 'function')) {
        try { for (const v of Object.values(ex)) if (test(v)) return v; } catch (e) {}
      }
      return null;
    };
    for (const ex of cachedExports()) { const hit = scan(ex); if (hit) return hit; }
    for (const id of await modulesWith('spotify.ads.esperanto')) { const hit = scan(loadModule(id)); if (hit) return hit; }
    return null;
  }

  function findSettingsClient() {
    for (const ex of cachedExports()) {
      try {
        const client = ex.settingsClient;
        if (client && typeof client.updateAdServerEndpoint === 'function' && typeof client.updateSlotEnabled === 'function' &&
            (!client.transport || typeof client.transport.callSingle === 'function')) return client;
      } catch (e) {}
    }
    return null;
  }

  async function findPlatform() {
    const ok = (o) => {
      try {
        return !!o && typeof o === 'object' &&
          (!!o.AdManagers || typeof o.getAdManagers === 'function') &&
          (!!(o.UserAPI || o.version) || typeof o.getTransport === 'function');
      } catch (e) { return false; }
    };
    const seen = new Set();
    for (const sel of ['#main', '.Root', 'body']) {
      const root = document.querySelector(sel);
      if (!root) continue;
      const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
      if (!key) continue;
      const stack = [root[key]];
      let n = 0;
      while (stack.length && n++ < 80000) {
        if (dead) return null;
        if (n % 400 === 0) await api.yield();
        const f = stack.pop();
        if (!f || seen.has(f)) continue;
        seen.add(f);
        const p = f.memoizedProps;
        if (p && typeof p === 'object') {
          for (const c of [p, p.value, p.platform]) if (ok(c)) return c;
        }
        if (f.sibling) stack.push(f.sibling);
        if (f.child) stack.push(f.child);
      }
    }
    return null;
  }

  async function discoverRegistry() {
    if (!S.registry && typeof S.platform?.getRegistry === 'function') S.registry = await S.platform.getRegistry();
    if (!S.registry || dead) return;
    const map = S.registry._map;
    const entries = map instanceof Map ? [...map] : Object.entries(map || {});
    S.registryInstances = [];
    for (const [key, registration] of entries) {
      if (dead) return;
      const label = String(key);
      let value = registration?.instance;
      if (!value && /Symbol\((EsperantoTransport|PlayerAPI|ProductStateAPI)\)/.test(label) && typeof S.registry.resolve === 'function') {
        try { value = await S.registry.resolve(key); } catch (e) { once('registry:' + label, 'warn', 'Registro indisponível: ' + label); }
      }
      if (!value) continue;
      S.registryInstances.push({ label, value });
      if (/Symbol\(PlayerAPI\)/.test(label) && typeof value.getState === 'function') S.nativePlayer = value;
      if (/Symbol\(ProductStateAPI\)/.test(label)) S.productClient = value.productStateApi || null;
    }
    if (S.nativePlayer) once('native-player', 'ok', 'Player nativo obtido pelo registro (sem controle de reprodução)');
  }

  async function getTransport() {
    const compatible = (candidate, source) => {
      if (!candidate || typeof candidate.callSingle !== 'function') return null;
      S.transportSource = source;
      return candidate;
    };
    await discoverRegistry();
    for (const { label, value } of S.registryInstances) {
      const found = compatible(value, 'Registry/' + label.replace(/^Symbol\(|\)$/g, '')); if (found) return found;
    }
    const pl = S.platform;
    if (pl && typeof pl.getTransport === 'function') {
      try {
        const t = await Promise.resolve(pl.getTransport());
        const found = compatible(t, 'Platform.getTransport');
        if (found) return found;
      } catch (e) { note('transport', e); }
    }
    const ps = pl && ((pl.UserAPI && (pl.UserAPI._product_state || pl.UserAPI._product_state_service)) ||
      (pl.ProductStateAPI && pl.ProductStateAPI.productStateApi));
    for (const [value, source] of [[S.settings?.transport, 'Settings.transport'],
      [ps?.transport, 'ProductState.transport'], [pl?.transport, 'Platform.transport']]) {
      const found = compatible(value, source); if (found) return found;
    }
    // Native clients can export a valid Esperanto transport alongside a different
    // product-state transport. Never use truthiness as a compatibility check.
    for (const ex of cachedExports()) {
      try {
        for (const value of [ex, ...Object.values(ex || {})]) {
          const found = compatible(value?.transport, 'exports.transport') || compatible(value, 'exports');
          if (found) return found;
        }
      } catch {}
    }
    S.transportSource = '';
    return null;
  }

  async function findSlotsClient() {
    for (const ex of cachedExports()) {
      try {
        for (const value of [ex, ...Object.values(ex || {})]) {
          if (value && !incompatibleSlots.has(value) && typeof value.getSlots === 'function' && typeof value.clearAllAds === 'function' &&
              (!value.transport || typeof value.transport.callSingle === 'function')) return value;
        }
      } catch {}
    }
    return null;
  }

  function trackPlayer(inst, name, arg) {
    S.calls[name] = (S.calls[name] || 0) + 1;
    let uri = '';
    if (name === 'load') {
      const first = arg && ((arg._tracks && arg._tracks[0]) || (arg.tracks && arg.tracks[0]));
      uri = (first && first.uri) || '';
      if (/^spotify:(ad|canvas):/.test(uri)) return;
    } else {
      uri = (inst._currentTrack && inst._currentTrack.uri) || '';
      if (/^spotify:canvas:/.test(uri)) return;
    }
    S.players.add(inst);
  }

  async function hookPlayer() {
    for (const id of await modulesWith('allowSeeking', '_loadedList', 'LIST_PLAYER_NO_LIST')) {
      const ex = loadModule(id);
      if (!ex) continue;
      let cls = null;
      try {
        cls = Object.values(ex).find((v) => typeof v === 'function' && v.prototype &&
          v.prototype.seek && v.prototype.load && v.prototype._getTrackPlayer);
      } catch (e) {}
      if (!cls || dead) continue;
      const originals = [];
      for (const name of ['load', 'seek', 'next', 'pause', 'resume', 'play']) {
        const orig = cls.prototype[name];
        if (typeof orig !== 'function') continue;
        const wrapped = function (arg) {
          try { trackPlayer(this, name, arg); } catch (e) {}
          return orig.apply(this, arguments);
        };
        cls.prototype[name] = wrapped;
        originals.push([name, orig, wrapped]);
      }
      S.hook = { cls, originals };
      emit('ok', 'Player hookado (' + originals.map((o) => o[0]).join(', ') + ')');
      return true;
    }
    return false;
  }

  function playerAds() {
    const out = [];
    for (const p of S.players) {
      try {
        const t = p._currentTrack;
        if (t && t.contentType === 'ad') out.push(p);
      } catch (e) {}
    }
    return out;
  }

  const uriOf = (p) => { try { return (p._currentTrack && p._currentTrack.uri) || ''; } catch (e) { return ''; } };

  async function setupServices() {
    if (!S.settings) S.settings = findSettingsClient();
    if (!S.slots) {
      S.slots = await findSlotsClient();
      if (S.slots) S.slotTransport = 'cliente existente';
    }
    const transport = await getTransport();
    if (dead) return;
    S.transport = !!transport;
    if (!S.settings && transport) {
      const C = await findService(SERVICE.settings);
      if (C) { try { S.settings = new C(transport); } catch (e) { note('settings', e); } }
    }
    if (!S.slots && transport) {
      const C = await findService(SERVICE.slots);
      if (C && !dead && !incompatibleConstructors.has(C)) { try { S.slots = new C(transport); S.slotsClass = C; S.slotTransport = S.transportSource; } catch (e) { note('slots', e); } }
    }
    if (!S.slots && !transport) once('slots-incompatible', 'warn',
      'Camada de slots indisponível: nenhum transporte Esperanto com callSingle. Filtro de rede e gerentes continuam ativos.');
    if (transport && !S.rpcHook) await installNativeFilter(transport);
  }

  async function installNativeFilter(transport) {
    const Ads = await findService(SERVICE.ads), Settings = await findService(SERVICE.settings);
    if (dead || S.rpcHook || !Ads?.METHODS?.getAds?.responseType) return;
    const codec = Ads.METHODS.getAds.responseType;
    const requestCodec = Ads.METHODS.getAds.requestType;
    const slotCodec = Settings?.METHODS?.updateSlotEnabled?.requestType;
    const original = transport.callSingle;
    const wrapped = function (request, ...options) {
      if (!dead && request?.service === Ads.SERVICE_ID && request.method === 'GetAds') {
        S.nativeBlocked++; blocked++;
        let slot = '?'; try { slot = requestCodec?.decode(request.payload)?.slotId || '?'; } catch {}
        emit('net', 'GetAds bloqueado antes do transporte nativo; slot=' + slot);
        // The generated decoder receives its normal empty-inventory response.
        // No media request, mute, seek or playback command is sent.
        return Promise.resolve(codec.encode(codec.fromPartial({})).finish());
      }
      if (!dead && slotCodec && request?.service === Settings.SERVICE_ID && request.method === 'UpdateSlotEnabled') {
        try {
          const message = slotCodec.decode(request.payload);
          if (message.enabled) request = { ...request, payload: slotCodec.encode({ ...message, enabled: false }).finish() };
        } catch (e) { once('slot-codec', 'warn', 'Não foi possível validar a atualização de slot: ' + e.message); }
      }
      return original.call(this, request, ...options);
    };
    api.patch(transport, 'callSingle', wrapped);
    S.rpcHook = { transport, original, wrapped };
    once('native-filter', 'ok', 'Filtro nativo GetAds instalado (inventário vazio; reativação de slots bloqueada)');
  }

  async function neutralizeSlots() {
    const { settings, slots } = S;
    if (dead || (!settings && !slots)) return;
    if (slots) {
      try {
        const res = await slots.getSlots();
        const ids = ((res && res.adSlots) || []).map((s) => s.slotId || s.slot_id).filter(Boolean);
        if (ids.length) S.slotIds = ids;
      } catch (e) {
        if (/callSingle.*(?:not a function|não é uma função)/i.test(e?.message || '')) {
          once('slots-contract', 'warn', 'Cliente de slots incompatível com esta versão do Spotify; descartado.');
          incompatibleSlots.add(S.slots); if (S.slotsClass) incompatibleConstructors.add(S.slotsClass);
          S.slots = null; S.slotTransport = ''; return;
        }
        note('getSlots', e);
      }
    }
    if (dead) return;
    let okN = 0, failN = 0;
    const count = (v) => { S.slotCalls[v ? 'ok' : 'fail']++; if (v) okN++; else failN++; };
    for (const id of S.slotIds) {
      if (dead) return;
      if (settings && !S.slotSnapshots.has(id)) {
        try {
          const current = await settings.getSlotSettings?.({ slotId: id });
          const entry = current?.slotSettings?.find(slot => slot.id === id) || current?.slotSettings?.[0];
          if (entry && typeof entry.enabled === 'boolean') S.slotSnapshots.set(id, entry.enabled);
        } catch (e) { note('slotSnapshot', e); }
      }
      if (settings) {
        const done = await attempt('enabled', () => settings.updateSlotEnabled({ slotId: id, enabled: false }));
        count(done); if (done) S.disabledSlots.add(id);
      }
      else once('settings-unavailable', 'warn', 'Cliente Settings compatível indisponível; apenas limpeza dos slots nesta camada.');
      if (slots) count(await attempt('clear', () => slots.clearAllAds({ slotId: id })));
    }
    if (slots && !S.slotIds.length) once('noslots', 'info', 'Cliente de slots disponível; nenhum slot retornado neste momento.');
    const sig = S.slotIds.length + ':' + failN;
    if (S.slotIds.length && sig !== S.slotSig) {
      S.slotSig = sig;
      emit(failN ? 'warn' : 'ok', 'Slots de anúncio: ' + S.slotIds.length + ' tratados (ok ' + okN + ', falhas ' + failN + ')');
    }
  }

  async function shutdownManagers() {
    const pl = S.platform;
    if (!pl || dead) return;
    let m = pl.AdManagers;
    if (!m && typeof pl.getAdManagers === 'function') {
      try { m = await Promise.resolve(pl.getAdManagers()); } catch (e) { note('getAdManagers', e); }
    }
    if (!m || dead) return;
    S.adManagers = m;
    try { S.managerKeys = Object.keys(m).slice(0, 20); } catch (e) {}
    once('mgrkeys', 'info', 'Gerentes de anúncios disponíveis: ' + (S.managerKeys.join(', ') || 'nenhum'));
    const calls = [
      ['audio', 'disable'], ['billboard', 'disable'], ['leaderboard', 'disableLeaderboard'],
      ['sponsoredPlaylist', 'disable'], ['inStreamApi', 'disable'], ['embeddedAd', 'disable'],
    ];
    for (const [k, fn] of calls) {
      const o = m[k];
      if (!o) continue;
      if (dead) return;
      if (typeof o[fn] === 'function' && await attempt(k, () => o[fn]())) S.managers.add(k);
      if (typeof o.enable === 'function' && !o.enable.__iz) {
        const noop = () => {};
        noop.__iz = true;
        S.patches.push([o, 'enable', o.enable]);
        o.enable = noop;
      }
    }
    if (m.vto && m.vto.manager && typeof m.vto.manager.disable === 'function') {
      if (await attempt('vto', () => m.vto.manager.disable())) S.managers.add('vto');
    }
    if (m.audio && !S.patches.some(([o, k]) => o === m.audio && k === "isNewAdsNpvEnabled")) {
      S.patches.push([m.audio, "isNewAdsNpvEnabled", m.audio.isNewAdsNpvEnabled]);
      m.audio.isNewAdsNpvEnabled = false;
    }
    const msig = [...S.managers].join(', ');
    if (msig && msig !== S.mgrSig) { S.mgrSig = msig; emit('ok', 'Gerentes desativados: ' + msig); }
  }

  async function arm() {
    if (armBusy || dead) return;
    armBusy = true;
    S.tries++;
    try {
      if (!S.req) S.req = getReq();
      if (S.req) {
        if (!S.platform) S.platform = await findPlatform();
        await setupServices();
        if (dead) return;
        if (!S.nativePlayer && !S.hook) await hookPlayer();
        await enforceState();
        if (S.platform) once('platform', 'ok', 'Platform encontrado');
        if (S.transport) once('transport', 'ok', 'Transporte obtido');
        if (S.settings) once('settings', 'ok', 'Cliente Settings criado');
        if (S.slots) once('slots', 'ok', 'Cliente Slots criado');
        await neutralizeSlots();
        if (dead) return;
        await shutdownManagers();
        if (S.platform && S.settings) S.armed++;
        if (S.tries === 30 && !S.armed) emit('warn', 'Origem inativa: platform=' + !!S.platform + ', transporte=' + S.transport + ', settings=' + !!S.settings);
      }
    } catch (e) { note('arm', e); }
    finally { armBusy = false; }
  }

  async function armLoop() {
    armPromise = arm();
    await armPromise;
    if (dead) return;
    armTimer = api.timeout(armLoop, S.armed || S.tries > 30 ? CFG.armSlow : CFG.armFast);
  }

  function domSignals() {
    const w = $(SEL.widget);
    const t = w && w.querySelector(SEL.title);
    const titleTxt = ((t && t.textContent) || '').trim();
    return {
      exact: AD_EXACT.test(titleTxt),
      aria: !!w && AD_RE.test(w.getAttribute('aria-label') || ''),
      docTitle: AD_RE.test(document.title || ''),
      nextOff: isDisabled($(SEL.next)),
      titleTxt,
    };
  }

  function domAd() {
    const s = domSignals();
    return s.exact || ((s.aria || s.docTitle) && s.nextOff);
  }

  function toast(msg) {
    if (!CFG.notify) return;
    try {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'izify-ads-toast';
        Object.assign(toastEl.style, {
          position: 'fixed', left: '50%', bottom: '110px', transform: 'translateX(-50%)',
          zIndex: '2147483647', padding: '10px 18px', borderRadius: '999px',
          background: '#1f1f1f', color: '#fff', fontFamily: 'var(--encore-body-font-stack, sans-serif)',
          fontSize: '13px', fontWeight: '600', boxShadow: '0 8px 24px rgba(0,0,0,.5)',
          pointerEvents: 'none', opacity: '0', transition: 'opacity .2s ease',
        });
        (document.body || document.documentElement).appendChild(toastEl);
      }
      toastEl.textContent = msg;
      toastEl.style.opacity = '1';
      clearTimeout(toastTimer);
      toastTimer = api.timeout(() => { if (toastEl) toastEl.style.opacity = '0'; }, CFG.toastMs);
    } catch (e) {}
  }

  const nativeState = () => { try { return S.nativePlayer?.getState(); } catch { return null; } };
  const nativeAd = () => nativeState()?.item?.type === 'ad';
  function onAd(ps) {
    clearTimeout(endTimer); endTimer = null;
    if (adActive) return;
    adActive = true; adStart = Date.now();
    const alreadyLoaded = startedWithAd || nativeState()?.isPaused;
    emit(alreadyLoaded ? 'info' : 'warn', alreadyLoaded
      ? 'Anúncio já carregado; bloqueio aplicado no inventário nativo. A reprodução atual é preservada.'
      : 'Anúncio detectado durante o bloqueio; consulte Estado e Probe para conferir a origem.');
  }
  function onMaybeEnded() {
    if (!adActive || endTimer) return;
    endTimer = api.timeout(() => {
      endTimer = null; if (nativeAd() || playerAds().length || domAd()) return;
      adActive = false;
      emit('info', 'Player saiu do estado de anúncio (sem clique, skip ou mute do Izify).');
    }, CFG.endConfirm);
  }
  function tick() {
    try { const ps = playerAds(); if (nativeAd() || ps.length || domAd()) onAd(ps); else onMaybeEnded(); } catch {}
  }
  const pollId = api.interval(tick, CFG.poll);

  // Seletores escondidos por CSS. Dá para adicionar em runtime: izifyAds.hide('seletor')
  const HIDE = [
    '.main-leaderboardComponent-container', '.sponsor-container', '.main-nowPlayingBar-adsBanner',
    '[data-testid="leaderboard-ad"]', '[data-testid="ad-banner"]', '[data-testid="ads-banner"]',
    '[data-testid="sponsored-banner"]', '[data-testid*="hpto"]', '[data-ad-slot]',
    'div[data-testid="embedded-ad-carousel"]',
  ];
  const style = document.createElement('style');
  style.id = 'izify-ads-css';
  const applyHide = () => { style.textContent = HIDE.join(',\n') + '\n{ display:none !important; }\n'; };
  applyHide();
  (document.head || document.documentElement).appendChild(style);

  function hide(sel) {
    sel = String(sel || '').trim();
    if (!sel) return false;
    try { document.querySelector(sel); } catch (e) { emit('err', 'Seletor inválido: ' + sel); return false; }
    if (!HIDE.includes(sel)) { HIDE.push(sel); applyHide(); }
    emit('ok', 'Escondendo: ' + sel + ' (' + document.querySelectorAll(sel).length + ' elemento(s) agora)');
    return true;
  }
  function unhide(sel) {
    const i = HIDE.indexOf(sel);
    if (i < 0) return false;
    HIDE.splice(i, 1); applyHide();
    emit('info', 'Deixou de esconder: ' + sel);
    return true;
  }

  const hiddenDialogs = new Map();
  const CLOSE_SEL = 'button[aria-label="Close" i], button[aria-label*="Fechar" i], button[aria-label*="Cerrar" i], button[aria-label*="Schließen" i], button[data-testid*="close" i]';

  function killUpsell(node) {
    if (!node || node.nodeType !== 1) return;
    const dialogs = [];
    if (node.matches && node.matches('[role="dialog"], [role="alertdialog"]')) dialogs.push(node);
    if (node.querySelectorAll) node.querySelectorAll('[role="dialog"], [role="alertdialog"]').forEach((d) => dialogs.push(d));
    dialogs.forEach((d) => {
      const txt = d.textContent || '';
      if (txt.length > 500 || !/premium/i.test(txt)) return;
      if (!d.querySelector('a[href*="premium"]') && !/upgrade|assin|subscri|obter|get premium/i.test(txt)) return;
      const c = d.querySelector(CLOSE_SEL);
      // Apenas ocultação visual: nenhum clique automático.
      if (!hiddenDialogs.has(d)) hiddenDialogs.set(d, [d.style.getPropertyValue('display'), d.style.getPropertyPriority('display')]);
      d.style.setProperty('display', 'none', 'important');
      log('pop-up de Premium fechado');
    });
  }

  const obs = new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) killUpsell(n);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  const status = () => ({
    modulos: !!S.req,
    player: !!(S.nativePlayer || S.hook),
    playerNativo: !!S.nativePlayer,
    anuncioAtual: nativeAd(),
    pausado: nativeState()?.isPaused ?? null,
    instancias: S.nativePlayer ? 1 : S.players.size,
    chamadasPlayer: { ...S.calls },
    faixas: [...S.players].slice(0, 4).map((p) => {
      try { const t = p._currentTrack || {}; return (t.contentType || '?') + ' ' + String(t.uri || '').slice(0, 22); } catch (e) { return '?'; }
    }),
    settings: !!S.settings,
    slots: S.slotIds.length,
    chamadasSlot: { ...S.slotCalls },
    platform: !!S.platform,
    transporte: S.transport,
    origemTransporte: S.transportSource,
    transporteSlots: S.slotTransport,
    gerentes: [...S.managers],
    chavesGerentes: S.managerKeys,
    automacao: false,
    slotsDesativados: S.disabledSlots.size,
    filtroNativo: !!S.rpcHook,
    requisicoesNativasBloqueadas: S.nativeBlocked,
    bloqueados: blocked,
    vazados: leaked,
    estadoProduto: S.stateOk,
    rede: net.stats,
    erros: S.errors.slice(-5),
  });

  /* ================= Bloqueio na origem (camadas extras) ================= */

  // Camada: estado do produto. Diz ao cliente "ads = 0" (reaplicado em loop, o servidor pode resetar).
  const stateKeys = () => ({ ads: '0' });
  const productState = () => {
    const pl = S.platform;
    return S.productClient || pl && ((pl.UserAPI && (pl.UserAPI._product_state || pl.UserAPI._product_state_service)) ||
      (pl.ProductStateAPI && pl.ProductStateAPI.productStateApi)) || null;
  };
  async function enforceState() {
    const ps = productState();
    if (!ps) return;
    if (typeof ps.putOverridesValues !== 'function') { once('pso', 'warn', 'ProductState sem putOverridesValues'); return; }
    if (await attempt('productState', () => ps.putOverridesValues({ pairs: stateKeys() }))) {
      S.stateOk++;
      once('pstate', 'ok', 'Estado do produto aplicado: ' + JSON.stringify(stateKeys()));
    }
  }
  const stateTimer = api.interval(() => { if (!dead) statePromise = enforceState(); }, 15000);

  // Camada: rede da página (fetch/XHR) — a requisição de anúncio nem sai, igual adblock de navegador.
  const NET_HOST = /(^|\.)(doubleclick\.net|googlesyndication\.com|googleadservices\.com|2mdn\.net|moatads\.com|adsrvr\.org|adnxs\.com|pubmatic\.com|criteo\.(?:com|net)|casalemedia\.com|rubiconproject\.com)$/i;
  const SPOTIFY_HOST = /(^|\.)(spotify\.com|spotifycdn\.com|scdn\.co)$/i;
  const NET_PATH = /(^|\/)(ads|ad-logic|pagead|pubads|adserver|sponsored-playlist)(\/|$)/i;
  const NET_LOOSE = /(^|[\/._-])(ads?|advert\w*|sponsor\w*)([\/._?-]|$)/i; // só descoberta: loga, não bloqueia

  const net = (() => {
    const stats = { bloqueadas: 0, suspeitas: 0 };
    const seen = new Set();
    const orig = { fetch: window.fetch, open: XMLHttpRequest.prototype.open, send: XMLHttpRequest.prototype.send };
    let wFetch = null, wOpen = null, wSend = null;

    function check(url, via) {
      let u;
      try { u = new URL(String(url), location.href); } catch (e) { return false; }
      const block = NET_HOST.test(u.hostname) || (SPOTIFY_HOST.test(u.hostname) && NET_PATH.test(u.pathname));
      const loose = !block && NET_LOOSE.test(u.hostname + u.pathname);
      if (!block && !loose) return false;
      block ? stats.bloqueadas++ : stats.suspeitas++;
      const key = (block ? 'b:' : 's:') + u.hostname + u.pathname;
      if (!seen.has(key) && seen.size < 80) {
        seen.add(key);
        emit('net', (block ? 'BLOQUEADO ' : 'suspeito (não bloqueado) ') + via + ' ' + u.hostname + u.pathname);
      }
      return block;
    }

    function install() {
      wFetch = function (input) {
        try {
          const url = typeof input === 'string' ? input : (input && input.url) || String(input);
          if (check(url, 'fetch')) return Promise.reject(new TypeError('Failed to fetch'));
        } catch (e) {}
        return orig.fetch.apply(this, arguments);
      };
      wOpen = function (method, url) {
        try { this.__izUrl = url; } catch (e) {}
        return orig.open.apply(this, arguments);
      };
      wSend = function () {
        try {
          if (this.__izUrl && check(this.__izUrl, 'xhr')) {
            const x = this;
            api.timeout(() => { try { x.dispatchEvent(new ProgressEvent('error')); x.dispatchEvent(new ProgressEvent('loadend')); } catch (e) {} }, 0);
            return;
          }
        } catch (e) {}
        return orig.send.apply(this, arguments);
      };
      window.fetch = wFetch;
      XMLHttpRequest.prototype.open = wOpen;
      XMLHttpRequest.prototype.send = wSend;
      emit('ok', 'Filtro de rede instalado (fetch/XHR)');
    }

    function uninstall() {
      if (window.fetch === wFetch) window.fetch = orig.fetch;
      if (XMLHttpRequest.prototype.open === wOpen) XMLHttpRequest.prototype.open = orig.open;
      if (XMLHttpRequest.prototype.send === wSend) XMLHttpRequest.prototype.send = orig.send;
    }

    return { install, uninstall, stats };
  })();
  if (CFG.blockNet) net.install();

  // Diagnóstico sob demanda: sem console paralelo ou varredura automática.
  const AD_TOKEN = /(^|[\s_-])(ads?|advert\w*|sponsor\w*|promo\w*|upsell|hpto|banner)([\s_-]|$)/i;
  const seenEl = new WeakSet();
  const selectorFor = n => n.id ? '#' + CSS.escape(n.id) : n.getAttribute('data-testid') ? '[data-testid="' + CSS.escape(n.getAttribute('data-testid')) + '"]' : n.tagName.toLowerCase();
  function scan(force) {
    let found = 0, logged = 0;
    const hideSel = HIDE.join(',');
    let nodes;
    try {
    nodes = document.querySelectorAll('[data-testid], [aria-label], [class*="sponsor" i], [class*="advert" i], [class*="-ad-" i], [class*="-ads" i]');
    } catch (e) { return 0; }
    for (const n of nodes) {
    if (n.closest('#izify-dev-panel, #izify-dev-btn, #izify-ads-toast')) continue;
    const tid = n.getAttribute('data-testid') || '';
    const aria = n.getAttribute('aria-label') || '';
    const cls = typeof n.className === 'string' ? n.className : '';
    const hit = AD_TOKEN.test(tid) || AD_TOKEN.test(cls) || (aria && AD_EXACT.test(aria));
    if (!hit) continue;
    found++;
    if (seenEl.has(n) && !force) continue;
    seenEl.add(n);
    if (logged >= 25) continue;
    logged++;
    let hidden = false, rect = '';
    try { hidden = n.matches(hideSel) || getComputedStyle(n).display === 'none'; } catch (e) {}
    try { const r = n.getBoundingClientRect(); rect = Math.round(r.width) + 'x' + Math.round(r.height); } catch (e) {}
    emit('dom', 'Possível anúncio: ' + selectorFor(n) + ' | ' + rect + ' | ' +
      (hidden ? 'JÁ ESCONDIDO' : 'VISÍVEL → izifyAds.hide(\'' + selectorFor(n).replace(/'/g, "\\'") + '\')') +
      ((n.textContent || '').trim() ? ' | "' + n.textContent.trim().slice(0, 50) + '"' : ''));
    }
    if (force) emit('info', 'Scan DOM: ' + found + ' candidato(s)');
    return found;
  }

  async function destroy() {
    if (dead) return;
    dead = true;
    if (S.rpcHook && S.rpcHook.transport.callSingle === S.rpcHook.wrapped) S.rpcHook.transport.callSingle = S.rpcHook.original;
    await Promise.allSettled([armPromise, statePromise].filter(Boolean));
    for (const [slotId, enabled] of S.slotSnapshots) {
      try { await S.settings?.updateSlotEnabled({ slotId, enabled }); } catch (e) { api.log.warn("Restaurar slot", slotId, e.message); }
    }
    clearInterval(pollId);
    clearTimeout(armTimer);
    clearTimeout(endTimer);
    clearTimeout(toastTimer);
    if (toastEl) toastEl.remove();
    obs.disconnect();
    for (const [node, [display, priority]] of hiddenDialogs) { if (node.isConnected) { display ? node.style.setProperty('display', display, priority) : node.style.removeProperty('display'); } }
    hiddenDialogs.clear();
    net.uninstall();
    clearInterval(stateTimer);
    try { const ps = productState(); if (ps && typeof ps.delOverridesValues === 'function') await ps.delOverridesValues({ keys: Object.keys(stateKeys()) }); } catch (e) {}
    style.remove();
    if (S.adManagers) for (const k of S.managers) {
      const manager = S.adManagers[k];
      try { const original = S.patches.find(([o, key]) => o === manager && key === "enable"); if (original) original[2].call(manager); } catch (e) { api.log.warn("Restaurar gerente", k, e.message); }
    }
    if (S.hook) S.hook.originals.forEach(([n, o, w]) => { if (S.hook.cls.prototype[n] === w) S.hook.cls.prototype[n] = o; });
    S.patches.forEach(([o, k, v]) => { try { o[k] = v; } catch (e) {} });
    window.__izifyAds = null;
    delete window.izifyAds;
  }

  window.izifyAds = {
    destroy,
    status,
    logs: () => BUF.slice(),
    hide,
    unhide,
    hidden: () => HIDE.slice(),
    scan: () => scan(true),
    dev: () => api.izify.open("dev"),
    notify: (on) => { CFG.notify = !!on; },
    test: () => toast('Aviso de anúncio ativo'),
    debug: () => {
      const s = { ...status(), adNow: nativeAd() || playerAds().length > 0 || !!domAd(), dom: domSignals() };
      console.table(s);
      return s;
    },
  };
  window.__izifyAds = { destroy };
  log('ativo');

  window.izifyAds.ready = armLoop();
  api.timeout(() => { if (!dead) log('estado', status()); }, CFG.armWait);
  api.onCleanup(destroy);
  return destroy;
} });
