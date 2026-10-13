(async () => {
if (window.__izify?.destroy) await window.__izify.destroy();
window.__izifyModules = {};
window.__izifyAssets = {"probe":"(async () =\u003e {\r\n  const safe = (fn, dflt) =\u003e { try { return fn(); } catch (e) { return dflt; } };\r\n  const janela = Object.keys(window).filter((k) =\u003e /chunk|platform|spotify|cosmos|esperanto|webpack|^__sp/i.test(k)).slice(0, 20);\r\n  const key = Object.keys(window).find((k) =\u003e /^(rspack|webpack)Chunk/.test(k));\r\n  const chunk = key \u0026\u0026 window[key];\r\n  let req = null;\r\n  if (chunk \u0026\u0026 typeof chunk.push === \u0027function\u0027) {\r\n    const ret = chunk.push([[Symbol()], {}, (r) =\u003e { req = r; return r; }]);\r\n    req = req || ret;\r\n  }\r\n  if (!req || !req.m) return { erro: \u0027sem req\u0027, janela };\r\n  const channel = new MessageChannel();\r\n  const yieldWork = () =\u003e new Promise(resolve =\u003e { channel.port1.onmessage = resolve; channel.port2.postMessage(0); });\r\n  try {\r\n\r\n  const out = {\r\n    janela,\r\n    modulos: { chunk: key, definidos: Object.keys(req.m).length, cache: Object.keys(req.c || {}).length },\r\n    servicos: { total: 0, ads_produto: [] },\r\n    modulosAds: [],\r\n    clientes: [],\r\n    plataforma: [],\r\n    registroNativo: [],\r\n    adblock: window.izifyAds?.status() || null,\r\n  };\r\n\r\n  const PKEYS = [\u0027AdManagers\u0027, \u0027UserAPI\u0027, \u0027getAdManagers\u0027, \u0027ProductStateAPI\u0027, \u0027getProductStateAPI\u0027];\r\n  const platKeys = (o) =\u003e safe(() =\u003e (o \u0026\u0026 typeof o === \u0027object\u0027) ? PKEYS.filter((k) =\u003e k in o) : [], []);\r\n  const seenObj = new Set();\r\n  const platforms = [];\r\n  const addPlat = (where, o) =\u003e {\r\n    if (!o || typeof o !== \u0027object\u0027 || seenObj.has(o) || out.plataforma.length \u003e= 6) return;\r\n    const hit = platKeys(o);\r\n    if (!hit.length) return;\r\n    seenObj.add(o);\r\n    platforms.push(o);\r\n    out.plataforma.push({\r\n      onde: where,\r\n      chaves: hit,\r\n      amostra: safe(() =\u003e Object.keys(o).slice(0, 30), []),\r\n      transportUserAPI: safe(() =\u003e !!(o.UserAPI \u0026\u0026 (o.UserAPI._product_state || o.UserAPI._product_state_service || {}).transport), false),\r\n    });\r\n  };\r\n\r\n  const sids = new Set();\r\n  const exps = Object.entries(req.c || {}).map(([id, m]) =\u003e [id, m \u0026\u0026 m.exports]).filter(([, e]) =\u003e e);\r\n  for (const [id, ex] of exps) {\r\n    const vals = safe(() =\u003e (typeof ex === \u0027object\u0027 || typeof ex === \u0027function\u0027) ? [ex, ...Object.values(ex)] : [], []);\r\n    for (const v of vals) {\r\n      const sid = safe(() =\u003e typeof v === \u0027function\u0027 \u0026\u0026 v.SERVICE_ID, false);\r\n      if (sid) sids.add(sid);\r\n      if (safe(() =\u003e v \u0026\u0026 typeof v === \u0027object\u0027 \u0026\u0026 \u0027transport\u0027 in v, false) \u0026\u0026 out.clientes.length \u003c 8) {\r\n        out.clientes.push({ modulo: id, chaves: safe(() =\u003e Object.keys(v).slice(0, 12), []) });\r\n      }\r\n      addPlat(\u0027exports:\u0027 + id, v);\r\n    }\r\n  }\r\n  out.servicos.total = sids.size;\r\n  out.servicos.ads_produto = [...sids].filter((s) =\u003e /ads|product|state/i.test(s)).slice(0, 40);\r\n\r\n  const ids = Object.keys(req.m).filter((id) =\u003e safe(() =\u003e Function.prototype.toString.call(req.m[id]).includes(\u0027spotify.ads.esperanto\u0027), false));\r\n  out.modulosAds = ids.slice(0, 8).map((id) =\u003e {\r\n    const ex = safe(() =\u003e req(id), null);\r\n    const vals = safe(() =\u003e (ex \u0026\u0026 (typeof ex === \u0027object\u0027 || typeof ex === \u0027function\u0027)) ? Object.values(ex) : [], []);\r\n    return {\r\n      id,\r\n      noCache: !!(req.c \u0026\u0026 req.c[id]),\r\n      chaves: safe(() =\u003e Object.keys(ex || {}).slice(0, 10), []),\r\n      servicos: vals.map((v) =\u003e safe(() =\u003e typeof v === \u0027function\u0027 \u0026\u0026 v.SERVICE_ID, false)).filter(Boolean),\r\n    };\r\n  });\r\n  out.modulosAds.total = ids.length;\r\n\r\n  const doc = window.document;\r\n  let n = 0;\r\n  const seenF = new Set();\r\n  for (const sel of [\u0027#main\u0027, \u0027.Root\u0027, \u0027body\u0027]) {\r\n    const root = doc.querySelector(sel);\r\n    if (!root) continue;\r\n    const fk = Object.keys(root).find((k) =\u003e k.startsWith(\u0027__reactContainer$\u0027) || k.startsWith(\u0027__reactFiber$\u0027));\r\n    if (!fk) continue;\r\n    const stack = [root[fk]];\r\n    while (stack.length \u0026\u0026 n++ \u003c 80000) {\r\n      if (n % 400 === 0) await yieldWork();\r\n      const f = stack.pop();\r\n      if (!f || seenF.has(f)) continue;\r\n      seenF.add(f);\r\n      const p = f.memoizedProps;\r\n      if (p \u0026\u0026 typeof p === \u0027object\u0027) {\r\n        addPlat(\u0027props\u0027, p);\r\n        addPlat(\u0027props.value\u0027, p.value);\r\n        for (const k of safe(() =\u003e Object.keys(p).slice(0, 25), [])) addPlat(\u0027prop:\u0027 + k, safe(() =\u003e p[k], null));\r\n      }\r\n      const t = f.type;\r\n      if (t \u0026\u0026 typeof t === \u0027object\u0027) {\r\n        addPlat(\u0027ctx\u0027, safe(() =\u003e t._context \u0026\u0026 t._context._currentValue, null));\r\n        addPlat(\u0027ctxValue\u0027, safe(() =\u003e t._currentValue, null));\r\n      }\r\n      if (f.sibling) stack.push(f.sibling);\r\n      if (f.child) stack.push(f.child);\r\n    }\r\n  }\r\n  out.fibers = n;\r\n  for (const platform of platforms) {\r\n    if (typeof platform.getRegistry !== \u0027function\u0027) continue;\r\n    const registry = await platform.getRegistry();\r\n    const map = registry?._map;\r\n    const entries = map instanceof Map ? [...map] : Object.entries(map || {});\r\n    for (const [key, entry] of entries) {\r\n      const name = String(key), value = entry?.instance;\r\n      if (!/EsperantoTransport|PlayerAPI|ProductStateAPI/.test(name)) continue;\r\n      const player = /Symbol\\(PlayerAPI\\)/.test(name) ? safe(() =\u003e value.getState(), null) : null;\r\n      out.registroNativo.push({ nome: name, existente: !!value,\r\n        callSingle: typeof value?.callSingle === \u0027function\u0027,\r\n        metodos: safe(() =\u003e Object.getOwnPropertyNames(Object.getPrototypeOf(value)).slice(0,30), []),\r\n        player: player ? { tipo: player.item?.type, pausado: player.isPaused, emBuffer: player.isBuffering } : null });\r\n    }\r\n  }\r\n  return JSON.stringify(out);\r\n  } finally { channel.port1.close(); channel.port2.close(); }\r\n})();\r\n","builtins":[{"id":"ad-block","source":"/* @izify-plugin {\"id\":\"ad-block\",\"name\":\"Izify Adblock\",\"description\":\"Filtro de anúncios da página, slots, player e diagnóstico do Spotify Desktop.\",\"author\":\"Izify\",\"version\":\"2.2.0\"} */\nizify.registerPlugin({ id: \"ad-block\", start(api) {\n  \u0027use strict\u0027;\n  if (window.__izifyAds \u0026\u0026 typeof window.__izifyAds.destroy === \u0027function\u0027) {\n    try { window.__izifyAds.destroy(); } catch (e) {}\n  }\n\n  const CFG = {\n    poll: 400,\n    endConfirm: 400,\n    armFast: 1000,\n    armSlow: 15000,\n    armWait: 4000,\n    log: true,\n    notify: true,\n    toastMs: 2500,\n    blockNet: true,      // bloqueia requisições de anúncio feitas pela página (fetch/XHR)\n  };\n\n  const SEL = {\n    widget: \u0027[data-testid=\"now-playing-widget\"]\u0027,\n    title: \u0027[data-testid=\"context-item-info-title\"], [data-testid=\"context-item-link\"]\u0027,\n    next: \u0027[data-testid=\"control-button-skip-forward\"]\u0027,\n    mute: \u0027[data-testid=\"volume-bar-toggle-mute-button\"]\u0027,\n    volume: \u0027[data-testid=\"volume-bar\"] input[type=\"range\"]\u0027,\n  };\n\n  const AD_WORDS = \u0027advertisements?|advertentie|an[uú]ncios?|publicidade|publicidad|werbung|publicit[eé]|pubblicit[aà]|annons|reklame|reklam\u0027;\n  const AD_EXACT = new RegExp(\u0027^\\\\s*(?:\u0027 + AD_WORDS + \u0027)\\\\s*$\u0027, \u0027i\u0027);\n  const AD_RE = new RegExp(\u0027(?:\u0027 + AD_WORDS + \u0027)\u0027, \u0027i\u0027);\n  const MUTED_RE = /unmute|reativ|ativar som|activar som|restaur|r[eé]tablir|riattiva|stumm.*aus|ton an/i;\n\n  const SERVICE = {\n    ads: [\u0027spotify.ads.esperanto.proto.Ads\u0027],\n    slots: [\u0027spotify.ads.esperanto.slots.proto.Slots\u0027, \u0027spotify.ads.esperanto.proto.Slots\u0027],\n    settings: [\u0027spotify.ads.esperanto.settings.proto.Settings\u0027, \u0027spotify.ads.esperanto.proto.Settings\u0027],\n  };\n\n  const S = {\n    req: null, platform: null, settings: null, slots: null, slotIds: [],\n    registry: null, registryInstances: [], nativePlayer: null, productClient: null, adManagers: null, slotSnapshots: new Map(), disabledSlots: new Set(), rpcHook: null, nativeBlocked: 0,\n    transport: false, transportSource: \u0027\u0027, slotTransport: \u0027\u0027, managerKeys: [], tries: 0, calls: {},\n    hook: null, players: new Set(), patches: [], managers: new Set(),\n    stateOk: 0, skips: 0, slotCalls: { ok: 0, fail: 0 }, errors: [], armed: 0,\n    once: {}, errSeen: {}, slotSig: \u0027\u0027, mgrSig: \u0027\u0027,\n  };\n\n  let dead = false, armBusy = false, armTimer = null;\n  let adActive = false, endTimer = null, armPromise = null, statePromise = null;\n  let blocked = 0, leaked = 0, adStart = 0, toastEl = null, toastTimer = null;\n  const startedWithAd = /advertisement|publicidade|anúncio/i.test(document.querySelector(\u0027[data-testid=\"now-playing-widget\"]\u0027)?.getAttribute(\"aria-label\") || \"\");\n\n  const BUF = (window.__izifyAdsLog = window.__izifyAdsLog || []);\n  const emit = (level, msg) =\u003e {\n    const e = { t: Date.now(), level, msg };\n    BUF.push(e);\n    if (BUF.length \u003e 300) BUF.shift();\n    try { window.dispatchEvent(new CustomEvent(\u0027izify-ads-log\u0027, { detail: e })); } catch (err) {}\n    if (!dead) api.log[level === \u0027err\u0027 ? \u0027error\u0027 : level]?.(msg);\n  };\n  const log = (...a) =\u003e emit(\u0027info\u0027, a.map((x) =\u003e (typeof x === \u0027string\u0027 ? x : JSON.stringify(x))).join(\u0027 \u0027));\n  const once = (key, level, msg) =\u003e {\n    if (S.once[key]) return;\n    S.once[key] = true;\n    emit(level, msg);\n  };\n  const $ = (s) =\u003e document.querySelector(s);\n  const note = (tag, e) =\u003e {\n    const text = tag + \u0027: \u0027 + ((e \u0026\u0026 e.message) || e);\n    S.errors.push(text);\n    if (S.errors.length \u003e 20) S.errors.shift();\n    const n = (S.errSeen[text] = (S.errSeen[text] || 0) + 1);\n    if (n \u003c= 3 || n % 20 === 0) emit(\u0027err\u0027, text + (n \u003e 1 ? \u0027 (x\u0027 + n + \u0027)\u0027 : \u0027\u0027));\n  };\n  const attempt = async (tag, fn) =\u003e {\n    try { await fn(); return true; } catch (e) { note(tag, e); return false; }\n  };\n\n  function getReq() {\n    const key = Object.keys(window).find((k) =\u003e /^(rspack|webpack)Chunk/.test(k));\n    const chunk = key \u0026\u0026 window[key];\n    if (!chunk || typeof chunk.push !== \u0027function\u0027) return null;\n    let req = null;\n    const ret = chunk.push([[Symbol()], {}, (r) =\u003e { req = r; return r; }]);\n    req = req || ret;\n    return typeof req === \u0027function\u0027 \u0026\u0026 req.m ? req : null;\n  }\n\n  const exportCache = new Map();\n  const modCache = new Map(), incompatibleSlots = new WeakSet(), incompatibleConstructors = new Set();\n  async function modulesWith(...terms) {\n    const k = terms.join(\u0027|\u0027);\n    if (modCache.has(k)) return modCache.get(k);\n    const out = [];\n    let checked = 0;\n    for (const id of Object.keys(S.req.m)) {\n      if (dead) break;\n      if (checked++ % 150 === 0) await api.yield();\n      try {\n        const src = Function.prototype.toString.call(S.req.m[id]);\n        if (terms.every((t) =\u003e src.includes(t))) out.push(id);\n      } catch (e) {}\n    }\n    if (out.length) modCache.set(k, out);\n    return out;\n  }\n\n  function loadModule(id) {\n    try { const exports = S.req(id); exportCache.set(id, exports); return exports; } catch (e) { return null; }\n  }\n\n  const cachedExports = () =\u003e [...new Set([...exportCache.values(), ...Object.values(S.req.c || {}).map(m =\u003e m?.exports)].filter(Boolean))];\n\n  async function findService(names) {\n    const test = (v) =\u003e { try { return typeof v === \u0027function\u0027 \u0026\u0026 names.includes(v.SERVICE_ID); } catch (e) { return false; } };\n    const scan = (ex) =\u003e {\n      if (test(ex)) return ex;\n      if (ex \u0026\u0026 (typeof ex === \u0027object\u0027 || typeof ex === \u0027function\u0027)) {\n        try { for (const v of Object.values(ex)) if (test(v)) return v; } catch (e) {}\n      }\n      return null;\n    };\n    for (const ex of cachedExports()) { const hit = scan(ex); if (hit) return hit; }\n    for (const id of await modulesWith(\u0027spotify.ads.esperanto\u0027)) { const hit = scan(loadModule(id)); if (hit) return hit; }\n    return null;\n  }\n\n  function findSettingsClient() {\n    for (const ex of cachedExports()) {\n      try {\n        const client = ex.settingsClient;\n        if (client \u0026\u0026 typeof client.updateAdServerEndpoint === \u0027function\u0027 \u0026\u0026 typeof client.updateSlotEnabled === \u0027function\u0027 \u0026\u0026\n            (!client.transport || typeof client.transport.callSingle === \u0027function\u0027)) return client;\n      } catch (e) {}\n    }\n    return null;\n  }\n\n  async function findPlatform() {\n    const ok = (o) =\u003e {\n      try {\n        return !!o \u0026\u0026 typeof o === \u0027object\u0027 \u0026\u0026\n          (!!o.AdManagers || typeof o.getAdManagers === \u0027function\u0027) \u0026\u0026\n          (!!(o.UserAPI || o.version) || typeof o.getTransport === \u0027function\u0027);\n      } catch (e) { return false; }\n    };\n    const seen = new Set();\n    for (const sel of [\u0027#main\u0027, \u0027.Root\u0027, \u0027body\u0027]) {\n      const root = document.querySelector(sel);\n      if (!root) continue;\n      const key = Object.keys(root).find((k) =\u003e k.startsWith(\u0027__reactContainer$\u0027) || k.startsWith(\u0027__reactFiber$\u0027));\n      if (!key) continue;\n      const stack = [root[key]];\n      let n = 0;\n      while (stack.length \u0026\u0026 n++ \u003c 80000) {\n        if (dead) return null;\n        if (n % 400 === 0) await api.yield();\n        const f = stack.pop();\n        if (!f || seen.has(f)) continue;\n        seen.add(f);\n        const p = f.memoizedProps;\n        if (p \u0026\u0026 typeof p === \u0027object\u0027) {\n          for (const c of [p, p.value, p.platform]) if (ok(c)) return c;\n        }\n        if (f.sibling) stack.push(f.sibling);\n        if (f.child) stack.push(f.child);\n      }\n    }\n    return null;\n  }\n\n  async function discoverRegistry() {\n    if (!S.registry \u0026\u0026 typeof S.platform?.getRegistry === \u0027function\u0027) S.registry = await S.platform.getRegistry();\n    if (!S.registry || dead) return;\n    const map = S.registry._map;\n    const entries = map instanceof Map ? [...map] : Object.entries(map || {});\n    S.registryInstances = [];\n    for (const [key, registration] of entries) {\n      if (dead) return;\n      const label = String(key);\n      let value = registration?.instance;\n      if (!value \u0026\u0026 /Symbol\\((EsperantoTransport|PlayerAPI|ProductStateAPI)\\)/.test(label) \u0026\u0026 typeof S.registry.resolve === \u0027function\u0027) {\n        try { value = await S.registry.resolve(key); } catch (e) { once(\u0027registry:\u0027 + label, \u0027warn\u0027, \u0027Registro indisponível: \u0027 + label); }\n      }\n      if (!value) continue;\n      S.registryInstances.push({ label, value });\n      if (/Symbol\\(PlayerAPI\\)/.test(label) \u0026\u0026 typeof value.getState === \u0027function\u0027) S.nativePlayer = value;\n      if (/Symbol\\(ProductStateAPI\\)/.test(label)) S.productClient = value.productStateApi || null;\n    }\n    if (S.nativePlayer) once(\u0027native-player\u0027, \u0027ok\u0027, \u0027Player nativo obtido pelo registro (sem controle de reprodução)\u0027);\n  }\n\n  async function getTransport() {\n    const compatible = (candidate, source) =\u003e {\n      if (!candidate || typeof candidate.callSingle !== \u0027function\u0027) return null;\n      S.transportSource = source;\n      return candidate;\n    };\n    await discoverRegistry();\n    for (const { label, value } of S.registryInstances) {\n      const found = compatible(value, \u0027Registry/\u0027 + label.replace(/^Symbol\\(|\\)$/g, \u0027\u0027)); if (found) return found;\n    }\n    const pl = S.platform;\n    if (pl \u0026\u0026 typeof pl.getTransport === \u0027function\u0027) {\n      try {\n        const t = await Promise.resolve(pl.getTransport());\n        const found = compatible(t, \u0027Platform.getTransport\u0027);\n        if (found) return found;\n      } catch (e) { note(\u0027transport\u0027, e); }\n    }\n    const ps = pl \u0026\u0026 ((pl.UserAPI \u0026\u0026 (pl.UserAPI._product_state || pl.UserAPI._product_state_service)) ||\n      (pl.ProductStateAPI \u0026\u0026 pl.ProductStateAPI.productStateApi));\n    for (const [value, source] of [[S.settings?.transport, \u0027Settings.transport\u0027],\n      [ps?.transport, \u0027ProductState.transport\u0027], [pl?.transport, \u0027Platform.transport\u0027]]) {\n      const found = compatible(value, source); if (found) return found;\n    }\n    // Native clients can export a valid Esperanto transport alongside a different\n    // product-state transport. Never use truthiness as a compatibility check.\n    for (const ex of cachedExports()) {\n      try {\n        for (const value of [ex, ...Object.values(ex || {})]) {\n          const found = compatible(value?.transport, \u0027exports.transport\u0027) || compatible(value, \u0027exports\u0027);\n          if (found) return found;\n        }\n      } catch {}\n    }\n    S.transportSource = \u0027\u0027;\n    return null;\n  }\n\n  async function findSlotsClient() {\n    for (const ex of cachedExports()) {\n      try {\n        for (const value of [ex, ...Object.values(ex || {})]) {\n          if (value \u0026\u0026 !incompatibleSlots.has(value) \u0026\u0026 typeof value.getSlots === \u0027function\u0027 \u0026\u0026 typeof value.clearAllAds === \u0027function\u0027 \u0026\u0026\n              (!value.transport || typeof value.transport.callSingle === \u0027function\u0027)) return value;\n        }\n      } catch {}\n    }\n    return null;\n  }\n\n  function trackPlayer(inst, name, arg) {\n    S.calls[name] = (S.calls[name] || 0) + 1;\n    let uri = \u0027\u0027;\n    if (name === \u0027load\u0027) {\n      const first = arg \u0026\u0026 ((arg._tracks \u0026\u0026 arg._tracks[0]) || (arg.tracks \u0026\u0026 arg.tracks[0]));\n      uri = (first \u0026\u0026 first.uri) || \u0027\u0027;\n      if (/^spotify:(ad|canvas):/.test(uri)) return;\n    } else {\n      uri = (inst._currentTrack \u0026\u0026 inst._currentTrack.uri) || \u0027\u0027;\n      if (/^spotify:canvas:/.test(uri)) return;\n    }\n    S.players.add(inst);\n  }\n\n  async function hookPlayer() {\n    for (const id of await modulesWith(\u0027allowSeeking\u0027, \u0027_loadedList\u0027, \u0027LIST_PLAYER_NO_LIST\u0027)) {\n      const ex = loadModule(id);\n      if (!ex) continue;\n      let cls = null;\n      try {\n        cls = Object.values(ex).find((v) =\u003e typeof v === \u0027function\u0027 \u0026\u0026 v.prototype \u0026\u0026\n          v.prototype.seek \u0026\u0026 v.prototype.load \u0026\u0026 v.prototype._getTrackPlayer);\n      } catch (e) {}\n      if (!cls || dead) continue;\n      const originals = [];\n      for (const name of [\u0027load\u0027, \u0027seek\u0027, \u0027next\u0027, \u0027pause\u0027, \u0027resume\u0027, \u0027play\u0027]) {\n        const orig = cls.prototype[name];\n        if (typeof orig !== \u0027function\u0027) continue;\n        const wrapped = function (arg) {\n          try { trackPlayer(this, name, arg); } catch (e) {}\n          return orig.apply(this, arguments);\n        };\n        cls.prototype[name] = wrapped;\n        originals.push([name, orig, wrapped]);\n      }\n      S.hook = { cls, originals };\n      emit(\u0027ok\u0027, \u0027Player hookado (\u0027 + originals.map((o) =\u003e o[0]).join(\u0027, \u0027) + \u0027)\u0027);\n      return true;\n    }\n    return false;\n  }\n\n  function playerAds() {\n    const out = [];\n    for (const p of S.players) {\n      try {\n        const t = p._currentTrack;\n        if (t \u0026\u0026 t.contentType === \u0027ad\u0027) out.push(p);\n      } catch (e) {}\n    }\n    return out;\n  }\n\n  const uriOf = (p) =\u003e { try { return (p._currentTrack \u0026\u0026 p._currentTrack.uri) || \u0027\u0027; } catch (e) { return \u0027\u0027; } };\n\n  async function setupServices() {\n    if (!S.settings) S.settings = findSettingsClient();\n    if (!S.slots) {\n      S.slots = await findSlotsClient();\n      if (S.slots) S.slotTransport = \u0027cliente existente\u0027;\n    }\n    const transport = await getTransport();\n    if (dead) return;\n    S.transport = !!transport;\n    if (!S.settings \u0026\u0026 transport) {\n      const C = await findService(SERVICE.settings);\n      if (C) { try { S.settings = new C(transport); } catch (e) { note(\u0027settings\u0027, e); } }\n    }\n    if (!S.slots \u0026\u0026 transport) {\n      const C = await findService(SERVICE.slots);\n      if (C \u0026\u0026 !dead \u0026\u0026 !incompatibleConstructors.has(C)) { try { S.slots = new C(transport); S.slotsClass = C; S.slotTransport = S.transportSource; } catch (e) { note(\u0027slots\u0027, e); } }\n    }\n    if (!S.slots \u0026\u0026 !transport) once(\u0027slots-incompatible\u0027, \u0027warn\u0027,\n      \u0027Camada de slots indisponível: nenhum transporte Esperanto com callSingle. Filtro de rede e gerentes continuam ativos.\u0027);\n    if (transport \u0026\u0026 !S.rpcHook) await installNativeFilter(transport);\n  }\n\n  async function installNativeFilter(transport) {\n    const Ads = await findService(SERVICE.ads), Settings = await findService(SERVICE.settings);\n    if (dead || S.rpcHook || !Ads?.METHODS?.getAds?.responseType) return;\n    const codec = Ads.METHODS.getAds.responseType;\n    const requestCodec = Ads.METHODS.getAds.requestType;\n    const slotCodec = Settings?.METHODS?.updateSlotEnabled?.requestType;\n    const original = transport.callSingle;\n    const wrapped = function (request, ...options) {\n      if (!dead \u0026\u0026 request?.service === Ads.SERVICE_ID \u0026\u0026 request.method === \u0027GetAds\u0027) {\n        S.nativeBlocked++; blocked++;\n        let slot = \u0027?\u0027; try { slot = requestCodec?.decode(request.payload)?.slotId || \u0027?\u0027; } catch {}\n        emit(\u0027net\u0027, \u0027GetAds bloqueado antes do transporte nativo; slot=\u0027 + slot);\n        // The generated decoder receives its normal empty-inventory response.\n        // No media request, mute, seek or playback command is sent.\n        return Promise.resolve(codec.encode(codec.fromPartial({})).finish());\n      }\n      if (!dead \u0026\u0026 slotCodec \u0026\u0026 request?.service === Settings.SERVICE_ID \u0026\u0026 request.method === \u0027UpdateSlotEnabled\u0027) {\n        try {\n          const message = slotCodec.decode(request.payload);\n          if (message.enabled) request = { ...request, payload: slotCodec.encode({ ...message, enabled: false }).finish() };\n        } catch (e) { once(\u0027slot-codec\u0027, \u0027warn\u0027, \u0027Não foi possível validar a atualização de slot: \u0027 + e.message); }\n      }\n      return original.call(this, request, ...options);\n    };\n    api.patch(transport, \u0027callSingle\u0027, wrapped);\n    S.rpcHook = { transport, original, wrapped };\n    once(\u0027native-filter\u0027, \u0027ok\u0027, \u0027Filtro nativo GetAds instalado (inventário vazio; reativação de slots bloqueada)\u0027);\n  }\n\n  async function neutralizeSlots() {\n    const { settings, slots } = S;\n    if (dead || (!settings \u0026\u0026 !slots)) return;\n    if (slots) {\n      try {\n        const res = await slots.getSlots();\n        const ids = ((res \u0026\u0026 res.adSlots) || []).map((s) =\u003e s.slotId || s.slot_id).filter(Boolean);\n        if (ids.length) S.slotIds = ids;\n      } catch (e) {\n        if (/callSingle.*(?:not a function|não é uma função)/i.test(e?.message || \u0027\u0027)) {\n          once(\u0027slots-contract\u0027, \u0027warn\u0027, \u0027Cliente de slots incompatível com esta versão do Spotify; descartado.\u0027);\n          incompatibleSlots.add(S.slots); if (S.slotsClass) incompatibleConstructors.add(S.slotsClass);\n          S.slots = null; S.slotTransport = \u0027\u0027; return;\n        }\n        note(\u0027getSlots\u0027, e);\n      }\n    }\n    if (dead) return;\n    let okN = 0, failN = 0;\n    const count = (v) =\u003e { S.slotCalls[v ? \u0027ok\u0027 : \u0027fail\u0027]++; if (v) okN++; else failN++; };\n    for (const id of S.slotIds) {\n      if (dead) return;\n      if (settings \u0026\u0026 !S.slotSnapshots.has(id)) {\n        try {\n          const current = await settings.getSlotSettings?.({ slotId: id });\n          const entry = current?.slotSettings?.find(slot =\u003e slot.id === id) || current?.slotSettings?.[0];\n          if (entry \u0026\u0026 typeof entry.enabled === \u0027boolean\u0027) S.slotSnapshots.set(id, entry.enabled);\n        } catch (e) { note(\u0027slotSnapshot\u0027, e); }\n      }\n      if (settings) {\n        const done = await attempt(\u0027enabled\u0027, () =\u003e settings.updateSlotEnabled({ slotId: id, enabled: false }));\n        count(done); if (done) S.disabledSlots.add(id);\n      }\n      else once(\u0027settings-unavailable\u0027, \u0027warn\u0027, \u0027Cliente Settings compatível indisponível; apenas limpeza dos slots nesta camada.\u0027);\n      if (slots) count(await attempt(\u0027clear\u0027, () =\u003e slots.clearAllAds({ slotId: id })));\n    }\n    if (slots \u0026\u0026 !S.slotIds.length) once(\u0027noslots\u0027, \u0027info\u0027, \u0027Cliente de slots disponível; nenhum slot retornado neste momento.\u0027);\n    const sig = S.slotIds.length + \u0027:\u0027 + failN;\n    if (S.slotIds.length \u0026\u0026 sig !== S.slotSig) {\n      S.slotSig = sig;\n      emit(failN ? \u0027warn\u0027 : \u0027ok\u0027, \u0027Slots de anúncio: \u0027 + S.slotIds.length + \u0027 tratados (ok \u0027 + okN + \u0027, falhas \u0027 + failN + \u0027)\u0027);\n    }\n  }\n\n  async function shutdownManagers() {\n    const pl = S.platform;\n    if (!pl || dead) return;\n    let m = pl.AdManagers;\n    if (!m \u0026\u0026 typeof pl.getAdManagers === \u0027function\u0027) {\n      try { m = await Promise.resolve(pl.getAdManagers()); } catch (e) { note(\u0027getAdManagers\u0027, e); }\n    }\n    if (!m || dead) return;\n    S.adManagers = m;\n    try { S.managerKeys = Object.keys(m).slice(0, 20); } catch (e) {}\n    once(\u0027mgrkeys\u0027, \u0027info\u0027, \u0027Gerentes de anúncios disponíveis: \u0027 + (S.managerKeys.join(\u0027, \u0027) || \u0027nenhum\u0027));\n    const calls = [\n      [\u0027audio\u0027, \u0027disable\u0027], [\u0027billboard\u0027, \u0027disable\u0027], [\u0027leaderboard\u0027, \u0027disableLeaderboard\u0027],\n      [\u0027sponsoredPlaylist\u0027, \u0027disable\u0027], [\u0027inStreamApi\u0027, \u0027disable\u0027], [\u0027embeddedAd\u0027, \u0027disable\u0027],\n    ];\n    for (const [k, fn] of calls) {\n      const o = m[k];\n      if (!o) continue;\n      if (dead) return;\n      if (typeof o[fn] === \u0027function\u0027 \u0026\u0026 await attempt(k, () =\u003e o[fn]())) S.managers.add(k);\n      if (typeof o.enable === \u0027function\u0027 \u0026\u0026 !o.enable.__iz) {\n        const noop = () =\u003e {};\n        noop.__iz = true;\n        S.patches.push([o, \u0027enable\u0027, o.enable]);\n        o.enable = noop;\n      }\n    }\n    if (m.vto \u0026\u0026 m.vto.manager \u0026\u0026 typeof m.vto.manager.disable === \u0027function\u0027) {\n      if (await attempt(\u0027vto\u0027, () =\u003e m.vto.manager.disable())) S.managers.add(\u0027vto\u0027);\n    }\n    if (m.audio \u0026\u0026 !S.patches.some(([o, k]) =\u003e o === m.audio \u0026\u0026 k === \"isNewAdsNpvEnabled\")) {\n      S.patches.push([m.audio, \"isNewAdsNpvEnabled\", m.audio.isNewAdsNpvEnabled]);\n      m.audio.isNewAdsNpvEnabled = false;\n    }\n    const msig = [...S.managers].join(\u0027, \u0027);\n    if (msig \u0026\u0026 msig !== S.mgrSig) { S.mgrSig = msig; emit(\u0027ok\u0027, \u0027Gerentes desativados: \u0027 + msig); }\n  }\n\n  async function arm() {\n    if (armBusy || dead) return;\n    armBusy = true;\n    S.tries++;\n    try {\n      if (!S.req) S.req = getReq();\n      if (S.req) {\n        if (!S.platform) S.platform = await findPlatform();\n        await setupServices();\n        if (dead) return;\n        if (!S.nativePlayer \u0026\u0026 !S.hook) await hookPlayer();\n        await enforceState();\n        if (S.platform) once(\u0027platform\u0027, \u0027ok\u0027, \u0027Platform encontrado\u0027);\n        if (S.transport) once(\u0027transport\u0027, \u0027ok\u0027, \u0027Transporte obtido\u0027);\n        if (S.settings) once(\u0027settings\u0027, \u0027ok\u0027, \u0027Cliente Settings criado\u0027);\n        if (S.slots) once(\u0027slots\u0027, \u0027ok\u0027, \u0027Cliente Slots criado\u0027);\n        await neutralizeSlots();\n        if (dead) return;\n        await shutdownManagers();\n        if (S.platform \u0026\u0026 S.settings) S.armed++;\n        if (S.tries === 30 \u0026\u0026 !S.armed) emit(\u0027warn\u0027, \u0027Origem inativa: platform=\u0027 + !!S.platform + \u0027, transporte=\u0027 + S.transport + \u0027, settings=\u0027 + !!S.settings);\n      }\n    } catch (e) { note(\u0027arm\u0027, e); }\n    finally { armBusy = false; }\n  }\n\n  async function armLoop() {\n    armPromise = arm();\n    await armPromise;\n    if (dead) return;\n    armTimer = api.timeout(armLoop, S.armed || S.tries \u003e 30 ? CFG.armSlow : CFG.armFast);\n  }\n\n  function domSignals() {\n    const w = $(SEL.widget);\n    const t = w \u0026\u0026 w.querySelector(SEL.title);\n    const titleTxt = ((t \u0026\u0026 t.textContent) || \u0027\u0027).trim();\n    return {\n      exact: AD_EXACT.test(titleTxt),\n      aria: !!w \u0026\u0026 AD_RE.test(w.getAttribute(\u0027aria-label\u0027) || \u0027\u0027),\n      docTitle: AD_RE.test(document.title || \u0027\u0027),\n      nextOff: isDisabled($(SEL.next)),\n      titleTxt,\n    };\n  }\n\n  function domAd() {\n    const s = domSignals();\n    return s.exact || ((s.aria || s.docTitle) \u0026\u0026 s.nextOff);\n  }\n\n  function toast(msg) {\n    if (!CFG.notify) return;\n    try {\n      if (!toastEl) {\n        toastEl = document.createElement(\u0027div\u0027);\n        toastEl.id = \u0027izify-ads-toast\u0027;\n        Object.assign(toastEl.style, {\n          position: \u0027fixed\u0027, left: \u002750%\u0027, bottom: \u0027110px\u0027, transform: \u0027translateX(-50%)\u0027,\n          zIndex: \u00272147483647\u0027, padding: \u002710px 18px\u0027, borderRadius: \u0027999px\u0027,\n          background: \u0027#1f1f1f\u0027, color: \u0027#fff\u0027, fontFamily: \u0027var(--encore-body-font-stack, sans-serif)\u0027,\n          fontSize: \u002713px\u0027, fontWeight: \u0027600\u0027, boxShadow: \u00270 8px 24px rgba(0,0,0,.5)\u0027,\n          pointerEvents: \u0027none\u0027, opacity: \u00270\u0027, transition: \u0027opacity .2s ease\u0027,\n        });\n        (document.body || document.documentElement).appendChild(toastEl);\n      }\n      toastEl.textContent = msg;\n      toastEl.style.opacity = \u00271\u0027;\n      clearTimeout(toastTimer);\n      toastTimer = api.timeout(() =\u003e { if (toastEl) toastEl.style.opacity = \u00270\u0027; }, CFG.toastMs);\n    } catch (e) {}\n  }\n\n  const nativeState = () =\u003e { try { return S.nativePlayer?.getState(); } catch { return null; } };\n  const nativeAd = () =\u003e nativeState()?.item?.type === \u0027ad\u0027;\n  function onAd(ps) {\n    clearTimeout(endTimer); endTimer = null;\n    if (adActive) return;\n    adActive = true; adStart = Date.now();\n    const alreadyLoaded = startedWithAd || nativeState()?.isPaused;\n    emit(alreadyLoaded ? \u0027info\u0027 : \u0027warn\u0027, alreadyLoaded\n      ? \u0027Anúncio já carregado; bloqueio aplicado no inventário nativo. A reprodução atual é preservada.\u0027\n      : \u0027Anúncio detectado durante o bloqueio; consulte Estado e Probe para conferir a origem.\u0027);\n  }\n  function onMaybeEnded() {\n    if (!adActive || endTimer) return;\n    endTimer = api.timeout(() =\u003e {\n      endTimer = null; if (nativeAd() || playerAds().length || domAd()) return;\n      adActive = false;\n      emit(\u0027info\u0027, \u0027Player saiu do estado de anúncio (sem clique, skip ou mute do Izify).\u0027);\n    }, CFG.endConfirm);\n  }\n  function tick() {\n    try { const ps = playerAds(); if (nativeAd() || ps.length || domAd()) onAd(ps); else onMaybeEnded(); } catch {}\n  }\n  const pollId = api.interval(tick, CFG.poll);\n\n  // Seletores escondidos por CSS. Dá para adicionar em runtime: izifyAds.hide(\u0027seletor\u0027)\n  const HIDE = [\n    \u0027.main-leaderboardComponent-container\u0027, \u0027.sponsor-container\u0027, \u0027.main-nowPlayingBar-adsBanner\u0027,\n    \u0027[data-testid=\"leaderboard-ad\"]\u0027, \u0027[data-testid=\"ad-banner\"]\u0027, \u0027[data-testid=\"ads-banner\"]\u0027,\n    \u0027[data-testid=\"sponsored-banner\"]\u0027, \u0027[data-testid*=\"hpto\"]\u0027, \u0027[data-ad-slot]\u0027,\n    \u0027div[data-testid=\"embedded-ad-carousel\"]\u0027,\n  ];\n  const style = document.createElement(\u0027style\u0027);\n  style.id = \u0027izify-ads-css\u0027;\n  const applyHide = () =\u003e { style.textContent = HIDE.join(\u0027,\\n\u0027) + \u0027\\n{ display:none !important; }\\n\u0027; };\n  applyHide();\n  (document.head || document.documentElement).appendChild(style);\n\n  function hide(sel) {\n    sel = String(sel || \u0027\u0027).trim();\n    if (!sel) return false;\n    try { document.querySelector(sel); } catch (e) { emit(\u0027err\u0027, \u0027Seletor inválido: \u0027 + sel); return false; }\n    if (!HIDE.includes(sel)) { HIDE.push(sel); applyHide(); }\n    emit(\u0027ok\u0027, \u0027Escondendo: \u0027 + sel + \u0027 (\u0027 + document.querySelectorAll(sel).length + \u0027 elemento(s) agora)\u0027);\n    return true;\n  }\n  function unhide(sel) {\n    const i = HIDE.indexOf(sel);\n    if (i \u003c 0) return false;\n    HIDE.splice(i, 1); applyHide();\n    emit(\u0027info\u0027, \u0027Deixou de esconder: \u0027 + sel);\n    return true;\n  }\n\n  const hiddenDialogs = new Map();\n  const CLOSE_SEL = \u0027button[aria-label=\"Close\" i], button[aria-label*=\"Fechar\" i], button[aria-label*=\"Cerrar\" i], button[aria-label*=\"Schließen\" i], button[data-testid*=\"close\" i]\u0027;\n\n  function killUpsell(node) {\n    if (!node || node.nodeType !== 1) return;\n    const dialogs = [];\n    if (node.matches \u0026\u0026 node.matches(\u0027[role=\"dialog\"], [role=\"alertdialog\"]\u0027)) dialogs.push(node);\n    if (node.querySelectorAll) node.querySelectorAll(\u0027[role=\"dialog\"], [role=\"alertdialog\"]\u0027).forEach((d) =\u003e dialogs.push(d));\n    dialogs.forEach((d) =\u003e {\n      const txt = d.textContent || \u0027\u0027;\n      if (txt.length \u003e 500 || !/premium/i.test(txt)) return;\n      if (!d.querySelector(\u0027a[href*=\"premium\"]\u0027) \u0026\u0026 !/upgrade|assin|subscri|obter|get premium/i.test(txt)) return;\n      const c = d.querySelector(CLOSE_SEL);\n      // Apenas ocultação visual: nenhum clique automático.\n      if (!hiddenDialogs.has(d)) hiddenDialogs.set(d, [d.style.getPropertyValue(\u0027display\u0027), d.style.getPropertyPriority(\u0027display\u0027)]);\n      d.style.setProperty(\u0027display\u0027, \u0027none\u0027, \u0027important\u0027);\n      log(\u0027pop-up de Premium fechado\u0027);\n    });\n  }\n\n  const obs = new MutationObserver((muts) =\u003e {\n    for (const m of muts) for (const n of m.addedNodes) killUpsell(n);\n  });\n  obs.observe(document.documentElement, { childList: true, subtree: true });\n\n  const status = () =\u003e ({\n    modulos: !!S.req,\n    player: !!(S.nativePlayer || S.hook),\n    playerNativo: !!S.nativePlayer,\n    anuncioAtual: nativeAd(),\n    pausado: nativeState()?.isPaused ?? null,\n    instancias: S.nativePlayer ? 1 : S.players.size,\n    chamadasPlayer: { ...S.calls },\n    faixas: [...S.players].slice(0, 4).map((p) =\u003e {\n      try { const t = p._currentTrack || {}; return (t.contentType || \u0027?\u0027) + \u0027 \u0027 + String(t.uri || \u0027\u0027).slice(0, 22); } catch (e) { return \u0027?\u0027; }\n    }),\n    settings: !!S.settings,\n    slots: S.slotIds.length,\n    chamadasSlot: { ...S.slotCalls },\n    platform: !!S.platform,\n    transporte: S.transport,\n    origemTransporte: S.transportSource,\n    transporteSlots: S.slotTransport,\n    gerentes: [...S.managers],\n    chavesGerentes: S.managerKeys,\n    automacao: false,\n    slotsDesativados: S.disabledSlots.size,\n    filtroNativo: !!S.rpcHook,\n    requisicoesNativasBloqueadas: S.nativeBlocked,\n    bloqueados: blocked,\n    vazados: leaked,\n    estadoProduto: S.stateOk,\n    rede: net.stats,\n    erros: S.errors.slice(-5),\n  });\n\n  /* ================= Bloqueio na origem (camadas extras) ================= */\n\n  // Camada: estado do produto. Diz ao cliente \"ads = 0\" (reaplicado em loop, o servidor pode resetar).\n  const stateKeys = () =\u003e ({ ads: \u00270\u0027 });\n  const productState = () =\u003e {\n    const pl = S.platform;\n    return S.productClient || pl \u0026\u0026 ((pl.UserAPI \u0026\u0026 (pl.UserAPI._product_state || pl.UserAPI._product_state_service)) ||\n      (pl.ProductStateAPI \u0026\u0026 pl.ProductStateAPI.productStateApi)) || null;\n  };\n  async function enforceState() {\n    const ps = productState();\n    if (!ps) return;\n    if (typeof ps.putOverridesValues !== \u0027function\u0027) { once(\u0027pso\u0027, \u0027warn\u0027, \u0027ProductState sem putOverridesValues\u0027); return; }\n    if (await attempt(\u0027productState\u0027, () =\u003e ps.putOverridesValues({ pairs: stateKeys() }))) {\n      S.stateOk++;\n      once(\u0027pstate\u0027, \u0027ok\u0027, \u0027Estado do produto aplicado: \u0027 + JSON.stringify(stateKeys()));\n    }\n  }\n  const stateTimer = api.interval(() =\u003e { if (!dead) statePromise = enforceState(); }, 15000);\n\n  // Camada: rede da página (fetch/XHR) — a requisição de anúncio nem sai, igual adblock de navegador.\n  const NET_HOST = /(^|\\.)(doubleclick\\.net|googlesyndication\\.com|googleadservices\\.com|2mdn\\.net|moatads\\.com|adsrvr\\.org|adnxs\\.com|pubmatic\\.com|criteo\\.(?:com|net)|casalemedia\\.com|rubiconproject\\.com)$/i;\n  const SPOTIFY_HOST = /(^|\\.)(spotify\\.com|spotifycdn\\.com|scdn\\.co)$/i;\n  const NET_PATH = /(^|\\/)(ads|ad-logic|pagead|pubads|adserver|sponsored-playlist)(\\/|$)/i;\n  const NET_LOOSE = /(^|[\\/._-])(ads?|advert\\w*|sponsor\\w*)([\\/._?-]|$)/i; // só descoberta: loga, não bloqueia\n\n  const net = (() =\u003e {\n    const stats = { bloqueadas: 0, suspeitas: 0 };\n    const seen = new Set();\n    const orig = { fetch: window.fetch, open: XMLHttpRequest.prototype.open, send: XMLHttpRequest.prototype.send };\n    let wFetch = null, wOpen = null, wSend = null;\n\n    function check(url, via) {\n      let u;\n      try { u = new URL(String(url), location.href); } catch (e) { return false; }\n      const block = NET_HOST.test(u.hostname) || (SPOTIFY_HOST.test(u.hostname) \u0026\u0026 NET_PATH.test(u.pathname));\n      const loose = !block \u0026\u0026 NET_LOOSE.test(u.hostname + u.pathname);\n      if (!block \u0026\u0026 !loose) return false;\n      block ? stats.bloqueadas++ : stats.suspeitas++;\n      const key = (block ? \u0027b:\u0027 : \u0027s:\u0027) + u.hostname + u.pathname;\n      if (!seen.has(key) \u0026\u0026 seen.size \u003c 80) {\n        seen.add(key);\n        emit(\u0027net\u0027, (block ? \u0027BLOQUEADO \u0027 : \u0027suspeito (não bloqueado) \u0027) + via + \u0027 \u0027 + u.hostname + u.pathname);\n      }\n      return block;\n    }\n\n    function install() {\n      wFetch = function (input) {\n        try {\n          const url = typeof input === \u0027string\u0027 ? input : (input \u0026\u0026 input.url) || String(input);\n          if (check(url, \u0027fetch\u0027)) return Promise.reject(new TypeError(\u0027Failed to fetch\u0027));\n        } catch (e) {}\n        return orig.fetch.apply(this, arguments);\n      };\n      wOpen = function (method, url) {\n        try { this.__izUrl = url; } catch (e) {}\n        return orig.open.apply(this, arguments);\n      };\n      wSend = function () {\n        try {\n          if (this.__izUrl \u0026\u0026 check(this.__izUrl, \u0027xhr\u0027)) {\n            const x = this;\n            api.timeout(() =\u003e { try { x.dispatchEvent(new ProgressEvent(\u0027error\u0027)); x.dispatchEvent(new ProgressEvent(\u0027loadend\u0027)); } catch (e) {} }, 0);\n            return;\n          }\n        } catch (e) {}\n        return orig.send.apply(this, arguments);\n      };\n      window.fetch = wFetch;\n      XMLHttpRequest.prototype.open = wOpen;\n      XMLHttpRequest.prototype.send = wSend;\n      emit(\u0027ok\u0027, \u0027Filtro de rede instalado (fetch/XHR)\u0027);\n    }\n\n    function uninstall() {\n      if (window.fetch === wFetch) window.fetch = orig.fetch;\n      if (XMLHttpRequest.prototype.open === wOpen) XMLHttpRequest.prototype.open = orig.open;\n      if (XMLHttpRequest.prototype.send === wSend) XMLHttpRequest.prototype.send = orig.send;\n    }\n\n    return { install, uninstall, stats };\n  })();\n  if (CFG.blockNet) net.install();\n\n  // Diagnóstico sob demanda: sem console paralelo ou varredura automática.\n  const AD_TOKEN = /(^|[\\s_-])(ads?|advert\\w*|sponsor\\w*|promo\\w*|upsell|hpto|banner)([\\s_-]|$)/i;\n  const seenEl = new WeakSet();\n  const selectorFor = n =\u003e n.id ? \u0027#\u0027 + CSS.escape(n.id) : n.getAttribute(\u0027data-testid\u0027) ? \u0027[data-testid=\"\u0027 + CSS.escape(n.getAttribute(\u0027data-testid\u0027)) + \u0027\"]\u0027 : n.tagName.toLowerCase();\n  function scan(force) {\n    let found = 0, logged = 0;\n    const hideSel = HIDE.join(\u0027,\u0027);\n    let nodes;\n    try {\n    nodes = document.querySelectorAll(\u0027[data-testid], [aria-label], [class*=\"sponsor\" i], [class*=\"advert\" i], [class*=\"-ad-\" i], [class*=\"-ads\" i]\u0027);\n    } catch (e) { return 0; }\n    for (const n of nodes) {\n    if (n.closest(\u0027#izify-dev-panel, #izify-dev-btn, #izify-ads-toast\u0027)) continue;\n    const tid = n.getAttribute(\u0027data-testid\u0027) || \u0027\u0027;\n    const aria = n.getAttribute(\u0027aria-label\u0027) || \u0027\u0027;\n    const cls = typeof n.className === \u0027string\u0027 ? n.className : \u0027\u0027;\n    const hit = AD_TOKEN.test(tid) || AD_TOKEN.test(cls) || (aria \u0026\u0026 AD_EXACT.test(aria));\n    if (!hit) continue;\n    found++;\n    if (seenEl.has(n) \u0026\u0026 !force) continue;\n    seenEl.add(n);\n    if (logged \u003e= 25) continue;\n    logged++;\n    let hidden = false, rect = \u0027\u0027;\n    try { hidden = n.matches(hideSel) || getComputedStyle(n).display === \u0027none\u0027; } catch (e) {}\n    try { const r = n.getBoundingClientRect(); rect = Math.round(r.width) + \u0027x\u0027 + Math.round(r.height); } catch (e) {}\n    emit(\u0027dom\u0027, \u0027Possível anúncio: \u0027 + selectorFor(n) + \u0027 | \u0027 + rect + \u0027 | \u0027 +\n      (hidden ? \u0027JÁ ESCONDIDO\u0027 : \u0027VISÍVEL → izifyAds.hide(\\\u0027\u0027 + selectorFor(n).replace(/\u0027/g, \"\\\\\u0027\") + \u0027\\\u0027)\u0027) +\n      ((n.textContent || \u0027\u0027).trim() ? \u0027 | \"\u0027 + n.textContent.trim().slice(0, 50) + \u0027\"\u0027 : \u0027\u0027));\n    }\n    if (force) emit(\u0027info\u0027, \u0027Scan DOM: \u0027 + found + \u0027 candidato(s)\u0027);\n    return found;\n  }\n\n  async function destroy() {\n    if (dead) return;\n    dead = true;\n    if (S.rpcHook \u0026\u0026 S.rpcHook.transport.callSingle === S.rpcHook.wrapped) S.rpcHook.transport.callSingle = S.rpcHook.original;\n    await Promise.allSettled([armPromise, statePromise].filter(Boolean));\n    for (const [slotId, enabled] of S.slotSnapshots) {\n      try { await S.settings?.updateSlotEnabled({ slotId, enabled }); } catch (e) { api.log.warn(\"Restaurar slot\", slotId, e.message); }\n    }\n    clearInterval(pollId);\n    clearTimeout(armTimer);\n    clearTimeout(endTimer);\n    clearTimeout(toastTimer);\n    if (toastEl) toastEl.remove();\n    obs.disconnect();\n    for (const [node, [display, priority]] of hiddenDialogs) { if (node.isConnected) { display ? node.style.setProperty(\u0027display\u0027, display, priority) : node.style.removeProperty(\u0027display\u0027); } }\n    hiddenDialogs.clear();\n    net.uninstall();\n    clearInterval(stateTimer);\n    try { const ps = productState(); if (ps \u0026\u0026 typeof ps.delOverridesValues === \u0027function\u0027) await ps.delOverridesValues({ keys: Object.keys(stateKeys()) }); } catch (e) {}\n    style.remove();\n    if (S.adManagers) for (const k of S.managers) {\n      const manager = S.adManagers[k];\n      try { const original = S.patches.find(([o, key]) =\u003e o === manager \u0026\u0026 key === \"enable\"); if (original) original[2].call(manager); } catch (e) { api.log.warn(\"Restaurar gerente\", k, e.message); }\n    }\n    if (S.hook) S.hook.originals.forEach(([n, o, w]) =\u003e { if (S.hook.cls.prototype[n] === w) S.hook.cls.prototype[n] = o; });\n    S.patches.forEach(([o, k, v]) =\u003e { try { o[k] = v; } catch (e) {} });\n    window.__izifyAds = null;\n    delete window.izifyAds;\n  }\n\n  window.izifyAds = {\n    destroy,\n    status,\n    logs: () =\u003e BUF.slice(),\n    hide,\n    unhide,\n    hidden: () =\u003e HIDE.slice(),\n    scan: () =\u003e scan(true),\n    dev: () =\u003e api.izify.open(\"dev\"),\n    notify: (on) =\u003e { CFG.notify = !!on; },\n    test: () =\u003e toast(\u0027Aviso de anúncio ativo\u0027),\n    debug: () =\u003e {\n      const s = { ...status(), adNow: nativeAd() || playerAds().length \u003e 0 || !!domAd(), dom: domSignals() };\n      console.table(s);\n      return s;\n    },\n  };\n  window.__izifyAds = { destroy };\n  log(\u0027ativo\u0027);\n\n  window.izifyAds.ready = armLoop();\n  api.timeout(() =\u003e { if (!dead) log(\u0027estado\u0027, status()); }, CFG.armWait);\n  api.onCleanup(destroy);\n  return destroy;\n} });\n"}],"logo":"\n⠀⠀⠀⠀⠀⠀⣄⠀⠀⠀⣦⣤⣾⣿⠿⠛⣋⣥⣤⣀⠀⠀⠀⠀\n⠀⠀⠀⠀⡤⡀⢈⢻⣬⣿⠟⢁⣤⣶⣿⣿⡿⠿⠿⠛⠛⢀⣄⠀\n⠀⠀⢢⣘⣿⣿⣶⣿⣯⣤⣾⣿⣿⣿⠟⠁⠄⠀⣾⡇⣼⢻⣿⣾\n⣰⠞⠛⢉⣩⣿⣿⣿⣿⣿⣿⣿⣿⠋⣼⣧⣤⣴⠟⣠⣿⢰⣿⣿\n⣶⡾⠿⠿⠿⢿⣿⣿⣿⣿⣿⣿⣿⣈⣩⣤⡶⠟⢛⣩⣴⣿⣿⡟        \n⣠⣄⠈⠀⣰⡦⠙⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⡛⠛⠛⠁           \n⣉⠛⠛⠛⣁⡔⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠥⠀⠀\n⣭⣏⣭⣭⣥⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⢠⠀","css":"\n:host{all:initial}\n*{box-sizing:border-box;margin:0}\n#layer{--line:rgba(255,255,255,.1);--sub:#b3b3b3;--accent:var(--iz-accent,#1ed760);--on:var(--iz-on-accent,#000);\n  font-family:var(--encore-body-font-stack,\"SpotifyMixUI\",\"CircularSp\",\"Circular Std\",-apple-system,\"Segoe UI\",Helvetica,Arial,sans-serif);\n  color:#fff;font-size:14px;line-height:1.4}\nbutton{font:inherit;color:inherit;cursor:pointer;border:0;background:none}\nsvg{fill:currentColor}\n.panel,.modal{-webkit-app-region:no-drag}\n\n/* ---------- botões ---------- */\n.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:999px;font-weight:700;font-size:15px;\n  text-decoration:none;transition:transform .1s ease,background .15s ease,border-color .15s}\n.btn:hover{transform:scale(1.04)}.btn:active{transform:scale(.98)}\n.btn.primary{background:var(--accent);color:var(--on)}\n.btn.primary:hover{filter:brightness(1.1)}\n.btn.ghost{color:#fff;box-shadow:inset 0 0 0 1px #7c7c7c}\n.btn.ghost:hover{box-shadow:inset 0 0 0 1px #fff}\n.btn svg{width:18px;height:18px}\n.btn.sm{padding:8px 16px;font-size:13px}\n\n/* ---------- boas-vindas ---------- */\n.overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);\n  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);pointer-events:auto;opacity:0;transition:opacity .25s ease}\n.overlay.show{opacity:1}\n.modal{width:min(460px,calc(100vw - 32px));padding:32px;border-radius:12px;\n  background:linear-gradient(180deg,#2c2c2c 0,#181818 190px);\n  background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 38%,#181818) 0,#181818 200px);\n  box-shadow:0 24px 64px rgba(0,0,0,.6);transform:translateY(14px) scale(.97);transition:transform .3s cubic-bezier(.2,.8,.2,1)}\n.overlay.show .modal{transform:none}\n.modal{--accent:#a78bfa;--on:#160e27;background:linear-gradient(180deg,#3a245c 0,#18141f 210px,#181818 100%)}\n.modal .ascii-welcome{color:#c4b5fd}\n.logo{width:56px;height:56px;border-radius:50%;background:var(--accent);color:var(--on);display:flex;align-items:center;justify-content:center;\n  margin-bottom:20px;box-shadow:0 8px 24px rgba(0,0,0,.4)}\n.logo svg{width:28px;height:28px}\nh1{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px}\n.lead{color:var(--sub);font-size:15px;margin-bottom:20px}\n.feat{list-style:none;padding:0;display:grid;gap:10px;margin-bottom:28px}\n.feat li{display:flex;gap:12px;align-items:flex-start;color:#e6e6e6}\n.feat svg{flex:none;width:20px;height:20px;color:var(--accent);margin-top:1px}\n.btns{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}\n.dont{display:flex;align-items:center;gap:8px;margin-top:20px;color:var(--sub);font-size:13px;cursor:pointer;user-select:none}\n.dont input{accent-color:var(--accent);width:16px;height:16px}\n\n/* ---------- painel ---------- */\n.panel{position:fixed;top:60px;right:16px;width:372px;max-height:calc(100vh - 140px);display:flex;flex-direction:column;\n  background:#181818;border:1px solid var(--line);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.65);\n  pointer-events:auto;visibility:hidden;opacity:0;transform:translateY(-6px) scale(.98);transform-origin:top right;\n  transition:opacity .15s ease,transform .15s ease,visibility .15s}\n.panel.open{visibility:visible;opacity:1;transform:none}\n.ph{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px}\n.pt{font-size:18px;font-weight:800;letter-spacing:-.01em}\n.x{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--sub)}\n.x:hover{background:#ffffff1a;color:#fff}.x svg{width:18px;height:18px}\n.tabs{display:flex;gap:8px;padding:8px 16px 12px;flex-wrap:wrap}\n.tab{padding:6px 14px;border-radius:999px;background:#ffffff14;font-size:13px;font-weight:600;transition:background .15s}\n.tab:hover{background:#ffffff26}\n.tab.on{background:#fff;color:#000}\n.body{overflow:auto;padding:0 16px 12px;flex:1}\n.body::-webkit-scrollbar{width:8px}.body::-webkit-scrollbar-thumb{background:#ffffff33;border-radius:8px}\nsection{display:none}section.on{display:block}\n.h{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--sub);margin:12px 0 6px}\n.presets{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px}\n.preset{display:flex;flex-direction:column;gap:6px;align-items:flex-start;padding:10px;border-radius:8px;background:#ffffff0d;\n  font-size:12px;font-weight:600;box-shadow:inset 0 0 0 2px transparent;transition:background .15s}\n.preset:hover{background:#ffffff1a}\n.preset.on{box-shadow:inset 0 0 0 2px var(--accent)}\n.sw{display:flex}.sw i{width:18px;height:18px;border-radius:50%;border:1px solid #ffffff33;margin-right:-5px}\n.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0}\n.row label{flex:1}\n.ctl{display:flex;align-items:center;gap:8px}\n.hex,.txt,textarea{background:#2a2a2a;border:1px solid transparent;border-radius:6px;color:#fff;font:inherit;font-size:13px;padding:7px 9px;outline:none}\n.hex{width:84px;font-family:ui-monospace,Consolas,monospace}\n.txt{width:100%}\ntextarea{width:100%;min-height:96px;resize:vertical;font-family:ui-monospace,Consolas,monospace;font-size:12px}\n.hex:focus,.txt:focus,textarea:focus{border-color:#ffffff66}\ninput[type=color]{width:32px;height:32px;padding:0;border:0;background:none;cursor:pointer}\ninput[type=color]::-webkit-color-swatch-wrapper{padding:0}\ninput[type=color]::-webkit-color-swatch{border:2px solid #ffffff40;border-radius:50%}\ninput[type=range]{width:160px;accent-color:var(--accent)}\n.out{width:44px;text-align:right;color:var(--sub);font-variant-numeric:tabular-nums;font-size:13px}\n.hint{color:var(--sub);font-size:12px;margin:6px 0}\n.hint.warn{color:#f5b84a}\n.chk{display:flex;align-items:center;gap:8px;margin:8px 0;color:#e6e6e6;cursor:pointer;user-select:none;font-size:13px}\n.chk input{accent-color:var(--accent);width:16px;height:16px}\n.jsout{margin-top:6px;padding:8px 10px;border-radius:6px;background:#0f0f0f;font:12px/1.4 ui-monospace,Consolas,monospace;\n  white-space:pre-wrap;word-break:break-word;max-height:120px;overflow:auto;color:#b3b3b3;display:none}\n.jsout.show{display:block}.jsout.err{color:#ff7b7b}.jsout.ok{color:#7be0a0}\n.acts{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}\n.pf{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid var(--line)}\n.link{font-size:13px;font-weight:600;color:var(--sub);text-decoration:none}\n.link:hover{color:#fff;text-decoration:underline}\n\nselect{background:#2a2a2a;border:1px solid transparent;border-radius:6px;color:#fff;font:inherit;font-size:13px;padding:7px 9px;outline:none;max-width:170px}\nselect:focus{border-color:#ffffff66}\n.mini{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--sub)}\n.mini:hover{background:#ffffff1a;color:#fff}.mini svg{width:16px;height:16px}\n.acts .txt{flex:1;min-width:0}\n.prof{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}\n.prof\u003espan:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}\n.pa{display:flex;align-items:center;gap:4px;flex:none}\n.pickbox{position:fixed;display:none;pointer-events:none;border:2px solid var(--accent);background:rgba(255,255,255,.15);\n  background:color-mix(in srgb,var(--accent) 20%,transparent);border-radius:4px;z-index:5}\n.picktip{position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#fff;color:#000;padding:8px 16px;border-radius:999px;\n  font-weight:700;font-size:13px;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.5);z-index:6}\n.toast{position:fixed;left:50%;bottom:110px;transform:translateX(-50%) translateY(10px);background:#fff;color:#000;padding:10px 18px;\n  border-radius:999px;font-weight:600;font-size:13px;opacity:0;pointer-events:none;transition:all .25s ease}\n.toast.show{opacity:1;transform:translateX(-50%)}\n\n/* Small additions to the original panel. */\n[hidden]{display:none!important}\nbutton:disabled{opacity:.4;cursor:default}\nbutton:focus-visible{outline:2px solid var(--accent);outline-offset:2px}\n.panel{width:min(400px,calc(100vw - 24px));max-height:calc(100dvh - 120px)}\n.panel.dev-wide{width:min(720px,calc(100vw - 24px))}\n.body{min-height:0;overscroll-behavior:contain}\n.pt{display:flex;align-items:center;gap:10px}\n.ascii-mini{font:1.5px/1 monospace;color:#ff78bd;white-space:pre;margin:0;flex:none}\n.ascii-welcome{font:8px/1 monospace;color:#ff78bd;white-space:pre;margin:0 0 20px;display:block;text-align:center}\n.tabs{gap:6px;padding-bottom:12px}\n.tab{padding:6px 11px}\n.font-list{height:158px;overflow:auto;margin:8px 0;border:1px solid var(--line);border-radius:8px;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#ffffff33 transparent}\n.font-option{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;padding:9px 10px;font-size:16px;border-bottom:1px solid #ffffff0d}\n.font-option:hover,.font-option[aria-selected=true]{background:#ffffff12}\n.font-option[aria-selected=true]{box-shadow:inset 3px 0 var(--accent)}\n.font-option small{font:10px sans-serif;color:var(--sub)}\n.font-preview{padding:12px;border:1px solid var(--line);border-radius:8px;margin:8px 0;font-size:18px;overflow-wrap:anywhere}\n.plugin-card{padding:12px 0;border-bottom:1px solid var(--line)}\n.plugin-title{display:flex;justify-content:space-between;align-items:center;gap:8px}\n.plugin-title strong{font-size:14px}\n.plugin-state{font-size:11px;color:var(--sub)}\n.plugin-state.active{color:#7be0a0}.plugin-state.error,.plugin-error{color:#ff7b7b!important}\n.plugin-card p{font-size:12px;color:var(--sub);margin:7px 0;overflow-wrap:anywhere}\n.plugin-card small{font-size:11px;color:var(--sub)}\n.dev-controls{display:flex;gap:8px;margin:8px 0}\n.dev-controls select{flex:1;min-width:0;max-width:none}\n.dev-logs{height:245px;overflow:auto;background:#101010;border:1px solid var(--line);border-radius:8px;padding:6px;margin-top:10px;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#ffffff33 transparent;user-select:text}\n.dev-wide .dev-logs{height:340px}\n.log-row{display:grid;grid-template-columns:60px 45px minmax(0,1fr);gap:2px 5px;padding:5px 3px;border-bottom:1px solid #ffffff0b;font:11px/1.45 Consolas,monospace}\n.log-row time,.log-row small{color:#999;font:inherit}.log-row small{text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.log-row b{color:var(--sub);font-size:10px}.log-row.error b{color:#ff7b7b}.log-row.warn b{color:#f5b84a}.log-row.ok b{color:#7be0a0}.log-row.net b,.log-row.dom b{color:#ff78bd}\n.log-row span{grid-column:1/-1;white-space:pre-wrap;overflow-wrap:anywhere}\n.dev-status{background:#101010;border:1px solid var(--line);border-radius:8px;padding:10px;max-height:220px;overflow:auto;font:11px/1.5 Consolas,monospace;white-space:pre-wrap;user-select:text;margin:8px 0}\n@media(max-width:520px){.panel{right:12px;top:56px;max-height:calc(100dvh - 70px)}.modal{max-height:calc(100dvh - 24px);overflow:auto;padding:24px}.row{gap:8px}.ctl{gap:6px}input[type=range]{width:120px}.tab{padding:6px 9px}.hex{width:78px}}\n@media(prefers-reduced-motion:reduce){.panel,.modal,.overlay,.btn,.toast{transition:none;transform:none}}\n"};
/* Shared, bounded log stream. Rendering belongs to the UI. */
(() => {
  const M = window.__izifyModules ||= {};
  M.createLogs = (limit = 800) => {
    const rows = [], subscribers = new Set();
    const stringify = value => {
      if (value instanceof Error) return value.stack || value.message;
      if (typeof value === 'string') return value;
      try { return JSON.stringify(value); } catch { return String(value); }
    };
    const write = (source, level, ...args) => {
      const row = { t: Date.now(), source, level: ({ err: 'error', log: 'info' })[level] || level,
        msg: args.map(stringify).join(' ').slice(0, 12000) };
      rows.push(row);
      if (rows.length > limit) rows.splice(0, rows.length - limit);
      for (const fn of subscribers) { try { fn(row); } catch { /* A view cannot break logging. */ } }
      return row;
    };
    return {
      write, list: () => rows.slice(), clear: () => { rows.length = 0; },
      subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
      scoped(source) {
        const logger = (...args) => write(source, 'info', ...args);
        for (const level of ['info', 'ok', 'warn', 'error', 'debug', 'net', 'dom']) {
          logger[level] = (...args) => write(source, level, ...args);
        }
        return logger;
      },
      text(rowsToExport = rows) {
        return rowsToExport.map(r => `${new Date(r.t).toISOString()} [${r.level.toUpperCase()}] [${r.source}] ${r.msg}`).join('\n');
      },
      destroy() { subscribers.clear(); },
    };
  };
})();

(() => {
  const M = window.__izifyModules ||= {};
  // Plugin code and assets never share the small synchronous preferences store.
  M.createStorage = log => {
    let connection;
    const open = () => connection ||= new Promise((resolve, reject) => {
      const request = indexedDB.open('izify', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Banco Izify bloqueado por outra janela.'));
    });
    const run = async (mode, operation) => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('files', mode);
        const request = operation(tx.objectStore('files'));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Falha ao gravar arquivos.'));
      });
    };
    return {
      read(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch (e) { log.warn('Preferência inválida:', key, e.message); return fallback; }
      },
      write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (e) { log.error('Não foi possível salvar:', key, e.message); return false; }
      },
      all: () => run('readonly', store => store.getAll()),
      get: id => run('readonly', store => store.get(id)),
      put: item => run('readwrite', store => store.put(item)),
      remove: id => run('readwrite', store => store.delete(id)),
      async close() { if (connection) { try { (await connection).close(); } catch {} } },
    };
  };
})();

(() => {
  const M = window.__izifyModules ||= {};
  const HEADER = /\/\*\s*@izify-plugin\s+(\{[\s\S]*?\})\s*\*\//;
  M.pluginManifest = source => {
    const match = HEADER.exec(source);
    if (!match) throw new Error('Falta o cabeçalho @izify-plugin. Veja plugins/example.js.');
    const meta = JSON.parse(match[1]);
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(meta.id || '') || ['constructor', 'prototype', '__proto__'].includes(meta.id)) throw new Error('ID de plugin inválido.');
    for (const key of ['name', 'description', 'author', 'version']) {
      if (typeof meta[key] !== 'string' || !meta[key].trim() || meta[key].length > 500) {
        throw new Error(`O plugin precisa de ${key} válido.`);
      }
    }
    if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(meta.version)) throw new Error('Versão deve seguir 1.0.0.');
    return Object.fromEntries(['id', 'name', 'description', 'author', 'version'].map(k => [k, meta[k]]));
  };
  M.createPlugins = ({ logs, storage, changed, getIzify }) => {
    const records = new Map(), queues = new Map();
    const raw = storage.read('izify:plugins:v1', {});
    const preferences = Object.assign(Object.create(null), raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {});
    let disposed = false;
    const persist = () => storage.write('izify:plugins:v1', preferences);
    const notify = () => changed?.();
    const serial = (id, fn) => {
      const next = (queues.get(id) || Promise.resolve()).catch(() => {}).then(fn);
      queues.set(id, next);
      return next;
    };
    function context(id) {
      const controller = new AbortController(), cleanups = [], timeouts = new Set(), intervals = new Set();
      const channel = new MessageChannel(), yields = new Map(); let yieldId = 0;
      channel.port1.onmessage = event => { const done = yields.get(event.data); if (done) { yields.delete(event.data); done(); } };
      cleanups.push(() => { for (const done of yields.values()) done(); yields.clear(); channel.port1.close(); channel.port2.close(); });
      let closed = false;
      const log = logs.scoped(id);
      const guard = fn => (...args) => {
        if (closed) return;
        try { Promise.resolve(fn(...args)).catch(e => log.error(e)); } catch (e) { log.error(e); }
      };
      const api = {
        id, log, signal: controller.signal,
        yield() {
          if (closed) return Promise.resolve();
          return new Promise(resolve => {
            const id = ++yieldId; yields.set(id, resolve); channel.port2.postMessage(id);
          });
        },
        get izify() { return getIzify(); },
        onCleanup(fn) { if (closed) fn(); else cleanups.push(fn); },
        timeout(fn, ms) {
          if (closed) return null;
          const token = setTimeout(() => { timeouts.delete(token); guard(fn)(); }, ms);
          timeouts.add(token); return token;
        },
        interval(fn, ms) {
          if (closed) return null;
          const token = setInterval(guard(fn), Math.max(50, ms)); intervals.add(token); return token;
        },
        on(target, event, fn, options) {
          if (closed) return;
          const callback = guard(fn);
          target.addEventListener(event, callback, options);
          cleanups.push(() => target.removeEventListener(event, callback, options));
        },
        observe(target, options, fn) {
          if (closed) return null;
          const observer = new MutationObserver(guard(fn)); observer.observe(target, options);
          cleanups.push(() => observer.disconnect()); return observer;
        },
        style(css) {
          if (closed) return null;
          const node = document.createElement('style'); node.dataset.izifyPlugin = id;
          node.textContent = css; document.head.append(node); cleanups.push(() => node.remove()); return node;
        },
        patch(target, key, value) {
          if (closed) return;
          const original = target[key]; target[key] = value;
          cleanups.push(() => { if (target[key] === value) target[key] = original; });
          return original;
        },
      };
      return { api, async cleanup() {
        if (closed) return;
        closed = true; controller.abort();
        timeouts.forEach(clearTimeout); intervals.forEach(clearInterval);
        for (const fn of cleanups.reverse()) { try { await fn(); } catch (e) { log.error('Limpeza:', e); } }
        cleanups.length = 0;
      } };
    }
    async function stop(record) {
      record.phase = 'stopping'; notify();
      try { if (record.stop) await record.stop(); }
      catch (e) { logs.write(record.meta.id, 'error', 'Desativação:', e); }
      finally {
        await record.context?.cleanup(); record.context = null; record.stop = null;
        record.phase = 'disabled'; notify();
      }
    }
    async function start(record) {
      if (disposed || record.phase === 'active') return;
      record.phase = 'starting'; record.error = ''; notify();
      const ctx = context(record.meta.id); record.context = ctx;
      try {
        let definition;
        const facade = Object.freeze({ registerPlugin(value) {
          if (definition) throw new Error('Registre apenas um plugin por arquivo.');
          definition = value;
        } });
        const logger = ctx.api.log;
        const scopedConsole = { log: logger, info: logger.info, warn: logger.warn, error: logger.error,
          debug: logger.debug, table: logger.debug, trace: logger.debug };
        new Function('izify', 'console', '"use strict";\n' + record.source + '\n')(facade, scopedConsole);
        if (!definition || typeof definition.start !== 'function') throw new Error('Registre um plugin com start(api).');
        if (definition.id !== record.meta.id) throw new Error('ID registrado difere do cabeçalho.');
        const cleanup = await definition.start(ctx.api);
        record.stop = typeof cleanup === 'function' ? cleanup : definition.stop?.bind(definition);
        record.phase = 'active'; logs.write(record.meta.id, 'ok', 'Plugin ativado.');
      } catch (e) {
        await ctx.cleanup(); record.context = null; record.phase = 'error'; record.error = e.message;
        logs.write(record.meta.id, 'error', 'Falha ao iniciar:', e);
      }
      notify();
    }
    const manager = {
      list: () => [...records.values()].sort((a, b) => Number(b.builtin) - Number(a.builtin)).map(r => ({ ...r.meta, builtin: r.builtin, phase: r.phase, error: r.error })),
      async install(source, { builtin = false, filename = '', restore = false } = {}) {
        if (disposed) throw new Error('Izify encerrado.');
        const meta = M.pluginManifest(source);
        return serial(meta.id, async () => {
          const existing = records.get(meta.id);
          if (existing?.builtin && !builtin) throw new Error('Esse ID pertence a um plugin integrado.');
          if (builtin && preferences[meta.id]?.removed) return;
          if (!builtin && !restore) await storage.put({ id: 'plugin:' + meta.id, source, filename });
          if (existing) await stop(existing);
          const record = { meta, source, builtin, filename, phase: 'disabled', error: '' };
          records.set(meta.id, record);
          if (!preferences[meta.id] || typeof preferences[meta.id] !== 'object') preferences[meta.id] = { enabled: builtin, removed: false };
          preferences[meta.id].removed = false; persist(); notify();
          logs.write(meta.id, 'info', `${restore ? 'Restaurado' : 'Instalado'}: ${meta.name} ${meta.version}`);
          if (preferences[meta.id].enabled) await start(record);
          return meta;
        });
      },
      enable(id, enabled) {
        return serial(id, async () => {
          const r = records.get(id); if (!r || disposed) return;
          preferences[id] = { enabled: !!enabled, removed: false }; persist();
          if (enabled) await start(r); else { await stop(r); logs.write(id, 'info', 'Plugin desativado.'); }
        });
      },
      remove(id) {
        return serial(id, async () => {
          const r = records.get(id); if (!r) return;
          await storage.remove('plugin:' + id);
          await stop(r); records.delete(id); preferences[id] = { enabled: false, removed: true }; persist();
          logs.write(id, 'info', 'Plugin excluído.'); notify();
        });
      },
      async restoreBuiltin(source) {
        const meta = M.pluginManifest(source); delete preferences[meta.id]; persist();
        return manager.install(source, { builtin: true });
      },
      async restore() {
        try {
          for (const item of await storage.all()) {
            if (disposed) break;
            if (item.id.startsWith('plugin:')) {
              try { await manager.install(item.source, { restore: true, filename: item.filename }); }
              catch (e) { logs.write('plugins', 'error', 'Arquivo salvo inválido:', item.id, e); }
            }
          }
        } catch (e) { logs.write('plugins', 'error', 'Plugins locais indisponíveis:', e); }
      },
      async destroy() {
        disposed = true;
        await Promise.allSettled([...queues.values()]);
        for (const record of records.values()) await stop(record);
        records.clear();
      },
    };
    return manager;
  };
})();

/* Addons for the original compact UI: no replacement layout. */
(() => {
  const M = window.__izifyModules ||= {};
  const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  M.panelSections = {
    fonts: `<input class="txt" id="fontSearch" type="search" placeholder="Buscar fonte…" aria-label="Buscar fonte">
      <div class="font-list" id="fontList" role="listbox" aria-label="Fontes"></div>
      <div class="acts"><input class="txt" id="fontCustom" placeholder="Outra fonte instalada"><button class="btn ghost sm" id="fontApply">Aplicar</button><button class="btn ghost sm" id="fontReset">Padrão</button></div>
      <div class="font-preview" id="fontPreview">Sua música, sua fonte. Aa Bb Cc 0123</div>`,
    plugins: `<div class="h">Seus plugins</div><div class="acts"><button class="btn primary sm" id="pluginPick">Adicionar .js</button><button class="btn ghost sm" id="pluginRestore">Restaurar adblock</button></div>
      <input id="pluginFile" type="file" accept=".js" hidden><p class="hint">Cada addon informa nome, descrição, autor e versão. Novos arquivos começam desativados.</p><div id="pluginList"></div>`,
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
      const query=$('#fontSearch').value.toLowerCase(),current=getState().style.font;
      const fonts=[...new Set(['Segoe UI','Arial','Verdana','Tahoma','Trebuchet MS','Georgia','Times New Roman','Consolas','Courier New','Comic Sans MS','Impact','Calibri','Cambria','Cascadia Mono',...[...document.fonts].map(f=>f.family.replace(/["']/g,'')),...(current?[current]:[])])];
      $('#fontList').innerHTML=fonts.filter(n=>n.toLowerCase().includes(query)).map(n=>`<button class="font-option" role="option" aria-selected="${n===current}" data-font="${escape(n)}" style="font-family:&quot;${escape(fontName(n))}&quot;,sans-serif" ${available(n)?'':'disabled'}><span>${escape(n)}</span>${available(n)?'':'<small>não instalada</small>'}</button>`).join('') || '<div class="hint">Nenhuma fonte encontrada.</div>';
    }
    function syncFont(){
      if(destroyed)return;
      const value=getState().style.font;
      $('#fontPreview').style.fontFamily=value?`"${fontName(value)}",sans-serif`:'inherit';
      if(panel.getRootNode().activeElement!==$('#fontCustom'))$('#fontCustom').value=value;
      for(const option of panel.querySelectorAll('.font-option'))option.setAttribute('aria-selected',String(option.dataset.font===value));
    }
    function chooseFont(name){name=fontName(name);if(name&&!available(name))return toast('Instale essa fonte no Windows antes de aplicar.');setFont(name);syncFont();renderFonts();}
    function renderPlugins(){
      if(destroyed)return;
      const labels={active:'Ativo',disabled:'Desativado',starting:'Iniciando…',stopping:'Parando…',error:'Erro'};
      $('#pluginList').innerHTML=plugins.list().map(p=>`<article class="plugin-card"><div class="plugin-title"><strong>${escape(p.name)}</strong><span class="plugin-state ${p.phase}">${labels[p.phase]}</span></div><p>${escape(p.description)}</p><small>${escape(p.author)} · v${escape(p.version)}</small>${p.error?`<p class="plugin-error">${escape(p.error)}</p>`:''}<div class="acts"><button class="btn ${p.phase==='active'?'ghost':'primary'} sm" data-plugin="${escape(p.id)}" data-enable="${p.phase!=='active'}" ${['starting','stopping'].includes(p.phase)?'disabled':''}>${p.phase==='active'?'Desativar':'Ativar'}</button><button class="btn ghost sm" data-remove-plugin="${escape(p.id)}">Excluir</button></div></article>`).join('')||'<p class="hint">Nenhum plugin instalado.</p>';
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
    on($('#fontSearch'),'input',renderFonts);on($('#fontList'),'click',e=>{const option=e.target.closest('[data-font]');if(option&&!option.disabled)chooseFont(option.dataset.font);});
    on($('#fontApply'),'click',()=>chooseFont($('#fontCustom').value));on($('#fontReset'),'click',()=>chooseFont(''));on($('#fontCustom'),'keydown',e=>{if(e.key==='Enter'){e.preventDefault();chooseFont(e.target.value);}});
    on($('#pluginPick'),'click',()=>$('#pluginFile').click());
    on($('#pluginFile'),'change',async e=>{const file=e.target.files[0];if(!file)return;try{if(!/\.js$/i.test(file.name)||file.size>1024*1024)throw new Error('Escolha um arquivo .js de até 1 MB.');await plugins.install(await file.text(),{filename:file.name});toast('Plugin importado. Use Ativar para iniciar.');}finally{e.target.value='';}});
    on($('#pluginRestore'),'click',async()=>{await plugins.restoreBuiltin(assets.builtins.find(p=>p.id==='ad-block').source);toast('Adblock restaurado.');});
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
  <div class="ph"><div class="pt"><pre class="ascii-mini" aria-hidden="true">${escHtml(assets.logo)}</pre>Personalizar Izify</div><button class="x" id="px" aria-label="Fechar">${svg(I.close)}</button></div>
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

await window.izify.ready;
window.__spotifyJsRunner = true;
return 'Izify 2.2.0 pronto';
})()