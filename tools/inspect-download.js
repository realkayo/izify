/* Read-only Spotify renderer diagnostic. Never returns tokens, cookies or audio keys. */
(async () => {
  const result = { renderer: location.hostname, nativePlayer: null, services: [], media: [], resources: [], moduleHints: [], streamImplementation: { storageResolver: false, commonEncryption: false, widevine: false } };
  const describeURL = value => {
    try { const url = new URL(value); return { protocol: url.protocol, host: url.hostname }; } catch { return null; }
  };
  result.media = [...document.querySelectorAll('audio,video')].map(node => ({ tag: node.tagName, source: describeURL(node.currentSrc), readyState: node.readyState }));
  result.resources = [...new Set(performance.getEntriesByType('resource').filter(entry => /audio|media|widevine|storage-resolve|license/i.test(entry.name)).map(entry => {
    try { const url = new URL(entry.name); return url.origin + url.pathname.replace(/[a-f0-9]{24,}/gi, '[file-id]'); } catch { return ''; }
  }).filter(Boolean))].slice(-20);
  let platform = window.__izifyInspection?.platforms?.[0];
  if (!platform) {
    const visited = new Set(), stack = [];
    for (const selector of ['#main','.Root','body']) {
      const node = document.querySelector(selector);
      const key = node && Object.keys(node).find(name => /^__react(Container|Fiber)\$/.test(name));
      if (key) stack.push(node[key]);
    }
    for (let count = 0; stack.length && count < 50000; count++) {
      const fiber = stack.pop(); if (!fiber || visited.has(fiber)) continue; visited.add(fiber);
      const props = fiber.memoizedProps;
      for (const candidate of [props, props?.value, props?.platform]) {
        if (candidate && typeof candidate.getRegistry === 'function' && (candidate.UserAPI || candidate.version || candidate.getAdManagers)) { platform = candidate; break; }
      }
      if (platform) break;
      if (fiber.child) stack.push(fiber.child); if (fiber.sibling) stack.push(fiber.sibling);
      if (count % 500 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  const registry = window.__izifyInspection?.registry || await platform?.getRegistry?.();
  const entries = registry?._map instanceof Map ? [...registry._map] : Object.entries(registry?._map || {});
  for (const [key, registration] of entries) {
    const label = String(key);
    if (!/player|audio|storage|media|cosmos|esperanto/i.test(label)) continue;
    const instance = registration?.instance;
    result.services.push({ label, available: !!instance, methods: instance ? Object.getOwnPropertyNames(Object.getPrototypeOf(instance) || {}).filter(name => name !== 'constructor').slice(0,50) : [] });
    if (/Symbol\(PlayerAPI\)/.test(label) && typeof instance?.getState === 'function') {
      const state = await Promise.race([Promise.resolve(instance.getState()), new Promise(resolve => setTimeout(() => resolve(null), 1500))]);
      result.nativePlayer = state ? { uri: state.item?.uri, type: state.item?.type, name: state.item?.name, paused: state.isPaused } : null;
    }
  }
  let req = window.__izifyInspection?.req;
  if (!req) {
    const key = Object.keys(window).find(name => /^(rspack|webpack)Chunk/.test(name));
    const chunk = key && window[key];
    if (typeof chunk?.push === 'function') chunk.push([[Symbol()], {}, value => { req = value; }]);
  }
  for (const [id, factory] of Object.entries(req?.m || {})) {
    const text = String(factory), terms = ['audio_key','AudioKey','storage-resolve','widevine','executeEsperantoCall'];
    if (text.includes('storage-resolve')) {
      result.streamImplementation.storageResolver = true;
      result.streamImplementation.commonEncryption ||= /protection\s*:\s*["']cenc["']/.test(text);
      result.streamImplementation.widevine ||= text.includes('com.widevine.alpha');
    }
    const hits = terms.filter(term => text.toLowerCase().includes(term.toLowerCase()));
    if (hits.length) result.moduleHints.push({ id, terms: hits });
    if (result.moduleHints.length === 30) break;
  }
  return result;
})()
