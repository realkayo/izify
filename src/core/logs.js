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
