/* Commands are consumed by the local runner over its existing CDP connection. */
(() => {
  const pending = new Map(), queue = [], cancelled = [];
  const instance = crypto.randomUUID();
  let heartbeat = 0;
  window.__izifyDownloadBridge = {
    instance,
    get connected() { return Date.now() - heartbeat < 8000; },
    drain() { heartbeat = Date.now(); return { instance, requests: queue.splice(0), cancelled: cancelled.splice(0) }; },
    reply(id, result) { const resolve = pending.get(id); if (resolve) { pending.delete(id); resolve(result); } },
    request(operation, data = {}, signal) {
      if (!this.connected) return Promise.reject(new Error('Abra o Spotify pelo launcher Izify ou execute run.ps1 sem -Once.'));
      if (pending.size) return Promise.reject(new Error('Aguarde a operação atual terminar.'));
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const abort = () => { cancelled.push(id); this.reply(id, { ok: false, error: 'Operação cancelada.' }); };
        const deadline = { status: 10000, search: 25000, inspect: 40000, setup: 300000, download: 620000 }[operation] || 40000;
        const timer = setTimeout(() => { cancelled.push(id); this.reply(id, { ok: false, error: 'A operação demorou demais e foi cancelada. Tente outra fonte.' }); }, deadline);
        pending.set(id, result => { clearTimeout(timer); signal?.removeEventListener('abort', abort); result.ok ? resolve(result.data) : reject(new Error(result.error)); });
        queue.push({ id, operation, data });
        if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
      });
    },
    dispose() {
      queue.length = 0;
      for (const resolve of pending.values()) resolve({ ok: false, error: 'Izify recarregado.' });
      pending.clear();
    },
  };
})();
