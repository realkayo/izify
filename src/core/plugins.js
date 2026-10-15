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
