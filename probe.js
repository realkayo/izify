(async () => {
  const safe = (fn, dflt) => { try { return fn(); } catch (e) { return dflt; } };
  const janela = Object.keys(window).filter((k) => /chunk|platform|spotify|cosmos|esperanto|webpack|^__sp/i.test(k)).slice(0, 20);
  const key = Object.keys(window).find((k) => /^(rspack|webpack)Chunk/.test(k));
  const chunk = key && window[key];
  let req = null;
  if (chunk && typeof chunk.push === 'function') {
    const ret = chunk.push([[Symbol()], {}, (r) => { req = r; return r; }]);
    req = req || ret;
  }
  if (!req || !req.m) return { erro: 'sem req', janela };
  const channel = new MessageChannel();
  const yieldWork = () => new Promise(resolve => { channel.port1.onmessage = resolve; channel.port2.postMessage(0); });
  try {

  const out = {
    janela,
    modulos: { chunk: key, definidos: Object.keys(req.m).length, cache: Object.keys(req.c || {}).length },
    servicos: { total: 0, ads_produto: [] },
    modulosAds: [],
    clientes: [],
    plataforma: [],
    registroNativo: [],
    adblock: window.izifyAds?.status() || null,
  };

  const PKEYS = ['AdManagers', 'UserAPI', 'getAdManagers', 'ProductStateAPI', 'getProductStateAPI'];
  const platKeys = (o) => safe(() => (o && typeof o === 'object') ? PKEYS.filter((k) => k in o) : [], []);
  const seenObj = new Set();
  const platforms = [];
  const addPlat = (where, o) => {
    if (!o || typeof o !== 'object' || seenObj.has(o) || out.plataforma.length >= 6) return;
    const hit = platKeys(o);
    if (!hit.length) return;
    seenObj.add(o);
    platforms.push(o);
    out.plataforma.push({
      onde: where,
      chaves: hit,
      amostra: safe(() => Object.keys(o).slice(0, 30), []),
      transportUserAPI: safe(() => !!(o.UserAPI && (o.UserAPI._product_state || o.UserAPI._product_state_service || {}).transport), false),
    });
  };

  const sids = new Set();
  const exps = Object.entries(req.c || {}).map(([id, m]) => [id, m && m.exports]).filter(([, e]) => e);
  for (const [id, ex] of exps) {
    const vals = safe(() => (typeof ex === 'object' || typeof ex === 'function') ? [ex, ...Object.values(ex)] : [], []);
    for (const v of vals) {
      const sid = safe(() => typeof v === 'function' && v.SERVICE_ID, false);
      if (sid) sids.add(sid);
      if (safe(() => v && typeof v === 'object' && 'transport' in v, false) && out.clientes.length < 8) {
        out.clientes.push({ modulo: id, chaves: safe(() => Object.keys(v).slice(0, 12), []) });
      }
      addPlat('exports:' + id, v);
    }
  }
  out.servicos.total = sids.size;
  out.servicos.ads_produto = [...sids].filter((s) => /ads|product|state/i.test(s)).slice(0, 40);

  const ids = Object.keys(req.m).filter((id) => safe(() => Function.prototype.toString.call(req.m[id]).includes('spotify.ads.esperanto'), false));
  out.modulosAds = ids.slice(0, 8).map((id) => {
    const ex = safe(() => req(id), null);
    const vals = safe(() => (ex && (typeof ex === 'object' || typeof ex === 'function')) ? Object.values(ex) : [], []);
    return {
      id,
      noCache: !!(req.c && req.c[id]),
      chaves: safe(() => Object.keys(ex || {}).slice(0, 10), []),
      servicos: vals.map((v) => safe(() => typeof v === 'function' && v.SERVICE_ID, false)).filter(Boolean),
    };
  });
  out.modulosAds.total = ids.length;

  const doc = window.document;
  let n = 0;
  const seenF = new Set();
  for (const sel of ['#main', '.Root', 'body']) {
    const root = doc.querySelector(sel);
    if (!root) continue;
    const fk = Object.keys(root).find((k) => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
    if (!fk) continue;
    const stack = [root[fk]];
    while (stack.length && n++ < 80000) {
      if (n % 400 === 0) await yieldWork();
      const f = stack.pop();
      if (!f || seenF.has(f)) continue;
      seenF.add(f);
      const p = f.memoizedProps;
      if (p && typeof p === 'object') {
        addPlat('props', p);
        addPlat('props.value', p.value);
        for (const k of safe(() => Object.keys(p).slice(0, 25), [])) addPlat('prop:' + k, safe(() => p[k], null));
      }
      const t = f.type;
      if (t && typeof t === 'object') {
        addPlat('ctx', safe(() => t._context && t._context._currentValue, null));
        addPlat('ctxValue', safe(() => t._currentValue, null));
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
  }
  out.fibers = n;
  for (const platform of platforms) {
    if (typeof platform.getRegistry !== 'function') continue;
    const registry = await platform.getRegistry();
    const map = registry?._map;
    const entries = map instanceof Map ? [...map] : Object.entries(map || {});
    for (const [key, entry] of entries) {
      const name = String(key), value = entry?.instance;
      if (!/EsperantoTransport|PlayerAPI|ProductStateAPI/.test(name)) continue;
      const player = /Symbol\(PlayerAPI\)/.test(name) ? safe(() => value.getState(), null) : null;
      out.registroNativo.push({ nome: name, existente: !!value,
        callSingle: typeof value?.callSingle === 'function',
        metodos: safe(() => Object.getOwnPropertyNames(Object.getPrototypeOf(value)).slice(0,30), []),
        player: player ? { tipo: player.item?.type, pausado: player.isPaused, emBuffer: player.isBuffering } : null });
    }
  }
  return JSON.stringify(out);
  } finally { channel.port1.close(); channel.port2.close(); }
})();
