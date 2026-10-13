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
