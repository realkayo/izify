/* @izify-plugin {"id":"download","name":"Izify Download","description":"Baixa áudio e vídeo no formato original com um componente local leve, sem conversão.","author":"Izify","version":"1.2.0"} */
/* Download icon: Lucide / Feather, ISC + MIT. See assets/icons/LICENSE. */
izify.registerPlugin({ id: 'download', start(api) {
  'use strict';
  const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3m9 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m2-5 5 5 5-5"/></svg>';
  const button = document.createElement('button');
  button.id = 'izify-download-btn'; button.type = 'button'; button.innerHTML = icon;
  button.title = 'Baixar música'; button.setAttribute('aria-label', 'Baixar música');
  button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', 'false');
  api.style('#izify-download-btn{display:inline-flex;flex:none;align-items:center;justify-content:center;width:32px;height:32px;margin:0 4px;border:0;border-radius:50%;background:none;color:#b3b3b3;cursor:pointer;-webkit-app-region:no-drag}#izify-download-btn:hover{color:#fff;background:#ffffff14}#izify-download-btn:focus-visible{outline:2px solid #a78bfa;outline-offset:2px}#izify-download-btn svg{width:18px;height:18px}');
  let host, root, overlay, busy = false, source = null, ready = false, session = 0;
  let operationController = null;
  let lastFocus, lastTrack = '', dead = false;
  const sources = new Map();
  const saved = (() => { try { return JSON.parse(localStorage.getItem('izify:download:v1')) || {}; } catch { return {}; } })();
  const track = () => {
    const widget = document.querySelector('[data-testid="now-playing-widget"]');
    const title = widget?.querySelector('[data-testid="context-item-info-title"], [data-testid="context-item-link"]')?.textContent?.trim() || '';
    const artists = [...(widget?.querySelectorAll('[data-testid="context-item-info-subtitle"] a, [data-testid="context-item-info-artist"], a[href*="/artist/"]') || [])].map(n => n.textContent.trim());
    const href = widget?.querySelector('a[href*="/track/"], a[href^="spotify:track:"]')?.getAttribute('href') || '';
    const id = /(?:\/track\/|spotify:track:)([a-zA-Z0-9]+)/.exec(href)?.[1];
    return { title, artist: [...new Set(artists)].join(', '), url: id ? `https://open.spotify.com/track/${id}` : '' };
  };
  const trackKey = current => current.url || JSON.stringify([current.title, current.artist]);
  function attach() {
    const widget = document.querySelector('[data-testid="now-playing-widget"]');
    if (widget && button.parentElement !== widget) widget.append(button);
    if (!widget && button.isConnected) button.remove();
    const current = track();
    button.title = current.title ? `Baixar ${current.title}` : 'Baixar música';
    if (host && !host.hidden && !busy && trackKey(current) !== lastTrack) {
      lastTrack = trackKey(current);
      root.querySelector('#track').textContent = current.title || 'Nenhuma música em reprodução';
      root.querySelector('#artist').textContent = current.artist;
      root.querySelector('#query').value = [current.artist, current.title].filter(Boolean).join(' ');
      resetSource();
      if (ready && current.title) work('Identificando a fonte da música atual…', () => automaticSource(current));
      else status('Nenhuma música disponível para identificar.');
    }
  }
  const $ = selector => root.querySelector(selector);
  function status(text) { $('#status').textContent = text; }
  function resetSource() {
    source = null; $('#results').replaceChildren(); $('#source').textContent = 'Nenhuma fonte selecionada';
    $('#format option[value="mp4"]').disabled = true;
    if ($('#format').value === 'mp4') $('#format').value = 'm4a';
    update();
  }
  function update() {
    for (const control of root.querySelectorAll('[data-action], input, select')) control.disabled = busy || !ready;
    $('#setup').disabled = busy; $('#setup').hidden = ready;
    const formats = source ? [...(source.audioFormats || []), ...(source.video ? ['mp4'] : [])] : ['m4a','webm'];
    for (const option of $('#format').options) option.disabled = !formats.includes(option.value);
    if (source && !formats.includes($('#format').value)) $('#format').value = formats[0] || '';
    $('#download').disabled = busy || !ready || !source || !$('#format').value;
    $('#cancel').hidden = !busy;
    $('#download').textContent = busy ? 'Aguarde…' : 'Baixar arquivo';
    overlay.setAttribute('aria-busy', String(busy));
  }
  async function work(message, fn) {
    if (busy || dead) return;
    const controller = new AbortController(); operationController = controller;
    busy = true; update(); status(message);
    try { await fn(); } catch (error) { if (!dead) { status(error.message); if (!controller.signal.aborted) $('#alternate').open = true; api.log.warn(error.message); } }
    finally { operationController = null; busy = false; if (!dead) update(); }
  }
  const request = (operation, data) => {
    const bridge = window.__izifyDownloadBridge;
    if (!bridge) throw new Error('Atualize o Izify para usar o componente local de download.');
    return bridge.request(operation, data, operationController?.signal || api.signal);
  };
  async function inspect(url, identity = lastTrack) {
    source = null; $('#source').textContent = 'Verificando fonte…';
    $('#format').value = $('#format').value === 'mp4' ? 'm4a' : $('#format').value;
    const selected = await request('inspect', { url });
    if (dead || trackKey(track()) !== identity) return;
    if (!selected.audioFormats?.length && !selected.video) throw new Error('Esta fonte exige conversão. Escolha outra versão para baixar no formato original.');
    source = selected; $('#source').textContent = `${selected.title} · ${selected.artist || 'YouTube'}`;
    sources.set(identity, selected);
    status(selected.video ? 'Fonte pronta. Vídeo original disponível, sem conversão.' : 'Áudio original pronto. Esta fonte não oferece vídeo com som em um único arquivo.');
  }
  async function findSources(query, identity = lastTrack) {
    resetSource();
    if (/^https?:\/\//i.test(query)) return inspect(query, identity);
    const results = await request('search', { query });
    if (dead || trackKey(track()) !== identity) return;
    for (const entry of results.entries) {
      const item = document.createElement('button'); item.className = 'result'; item.dataset.action = 'source';
      const title = document.createElement('strong'), meta = document.createElement('small');
      title.textContent = entry.title; meta.textContent = entry.artist || 'YouTube';
      item.append(title, meta); item.onclick = () => work('Verificando áudio e vídeo…', () => inspect(entry.url, identity));
      $('#results').append(item);
    }
    if (!results.entries.length) {
      $('#alternate').open = true;
      status('Nenhuma fonte encontrada. Tente outro nome ou cole um link.');
      return;
    }
    status('Verificando a fonte encontrada…');
    await inspect(results.entries[0].url, identity);
  }
  async function automaticSource(current) {
    if (!current.title) { status('Nenhuma música em reprodução. Você pode informar uma fonte.'); $('#alternate').open = true; return; }
    const cached = sources.get(trackKey(current));
    if (cached) {
      source = cached; $('#source').textContent = `${cached.title} · ${cached.artist || 'YouTube'}`;
      status('Fonte pronta para baixar.'); return;
    }
    status('Encontrando uma fonte para a música atual…');
    await findSources([current.artist, current.title].filter(Boolean).join(' '), trackKey(current));
  }
  function close() {
    if (!host || host.hidden) return;
    host.hidden = true; session++; button.setAttribute('aria-expanded', 'false');
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  function createMenu() {
    host = document.createElement('div'); host.id = 'izify-download-host';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${window.__izifyAssets.css}
      .modal{width:min(500px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;padding:24px}
      .heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.heading h1{font-size:23px;margin:0}
      .heading svg{fill:none;width:22px;height:22px;color:#c4b5fd}.heading span{display:flex;gap:10px;align-items:center}
      .track{padding:14px;background:#ffffff0a;border:1px solid var(--line);border-radius:8px;margin-bottom:16px}.track strong{display:block;font-size:16px;overflow-wrap:anywhere}
      label.field{display:block;color:#b3b3b3;font-size:12px;margin:12px 0 6px}.input,select{width:100%;background:#ffffff0d;border:1px solid #ffffff26;border-radius:8px;padding:10px 12px;color:#fff;font:inherit}select option{background:#242024}
      .search{display:flex;gap:8px}.search .input{min-width:0}.search .btn{flex:none}.hint{font-size:12px;color:#b3b3b3;overflow-wrap:anywhere}
      #alternate{margin-top:12px}summary{cursor:pointer;color:#c4b5fd;font-size:13px}summary:focus-visible{outline:2px solid #c4b5fd;outline-offset:2px}
      [hidden]{display:none!important}
      #results{display:grid;gap:6px;margin-top:10px;max-height:160px;overflow:auto}.result{border:1px solid var(--line);border-radius:8px;padding:10px;text-align:left;background:#ffffff08}.result:hover{background:#ffffff14}.result strong,.result small{display:block}.result small{color:#b3b3b3;margin-top:3px}
      #source{margin-top:10px;color:#c4b5fd}#status{margin:16px 0;min-height:34px;font-size:13px;color:#c4b5fd;overflow-wrap:anywhere}.btns{justify-content:flex-end}button:disabled{opacity:.5;cursor:default;transform:none}input:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid #c4b5fd;outline-offset:2px}
      @media(max-width:380px){.search{flex-wrap:wrap}.modal{padding:18px}}
    </style><div id="layer"><div class="overlay show" role="dialog" aria-modal="true" aria-labelledby="download-title"><div class="modal">
      <div class="heading"><span>${icon}<h1 id="download-title">Baixar com Izify</h1></span><button class="x" id="close" aria-label="Fechar">✕</button></div>
      <div class="track"><strong id="track"></strong><span class="hint" id="artist"></span></div>
      <p class="hint">A faixa atual é identificada automaticamente. Confira abaixo a fonte do YouTube que será baixada.</p>
      <p class="hint" id="source">Identificando fonte…</p>
      <details id="alternate"><summary>Trocar fonte</summary><label class="field" for="query">Outra versão ou link do vídeo</label><div class="search"><input class="input" id="query" maxlength="300" placeholder="Nome e artista ou https://youtube.com/…"><button class="btn ghost sm" id="search" data-action>Buscar</button></div>
      <div id="results" aria-label="Fontes encontradas"></div></details>
      <label class="field" for="format">Formato original</label><select id="format"><option value="m4a">Áudio · M4A</option><option value="webm">Áudio · WebM</option><option value="mp4" disabled>Vídeo · MP4 com som</option></select>
      <label class="field" for="folder">Salvar em</label><input class="input" id="folder" placeholder="Pasta de Downloads do Windows">
      <p id="status" role="status" aria-live="polite"></p><div class="btns"><button class="btn ghost sm" id="cancel" hidden>Cancelar</button><button class="btn ghost sm" id="setup">Instalar versão leve</button><button class="btn primary sm" id="download" disabled>Baixar arquivo</button></div>
    </div></div></div>`;
    overlay = $('.overlay'); document.body.append(host);
    $('#format').value = ['m4a','webm'].includes(saved.format) ? saved.format : 'm4a';
    $('#folder').value = saved.folder || '';
    api.on($('#close'), 'click', close);
    api.on($('#cancel'), 'click', () => operationController?.abort());
    api.on(overlay, 'click', event => { if (event.target === overlay) close(); });
    api.on($('#setup'), 'click', () => work('Instalando o componente leve: yt-dlp e QuickJS. O pacote anterior será substituído.', async () => {
      const tools = await request('setup'); if (dead) return; ready = tools.ready;
      if (!$('#folder').value) $('#folder').value = tools.folder;
      await automaticSource(track());
    }));
    const search = () => work('Buscando fontes…', async () => {
      await findSources($('#query').value.trim());
    });
    api.on($('#search'), 'click', search);
    api.on($('#query'), 'keydown', event => { if (event.key === 'Enter') { event.preventDefault(); search(); } });
    api.on($('#download'), 'click', () => work('Baixando o arquivo original… Você pode fechar este menu.', async () => {
      const format = $('#format').value, folder = $('#folder').value.trim();
      const result = await request('download', { url: source.url, format, folder });
      if (dead) return;
      try { localStorage.setItem('izify:download:v1', JSON.stringify({ format, folder })); } catch {}
      status(`Salvo em: ${result.file}`); api.log.ok('Download concluído:', result.file);
    }));
  }
  async function open() {
    if (!host) createMenu();
    if (!host.hidden && button.getAttribute('aria-expanded') === 'true') return close();
    api.izify.close(); lastFocus = document.activeElement; host.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    const current = track(); if (!busy) lastTrack = trackKey(current);
    $('#track').textContent = current.title || 'Nenhuma música em reprodução'; $('#artist').textContent = current.artist;
    if (!busy) { $('#query').value = [current.artist, current.title].filter(Boolean).join(' '); resetSource(); $('#alternate').open = false; }
    $('#close').focus();
    if (busy) return;
    const opening = ++session;
    await work('Conectando ao componente local…', async () => {
      const tools = await request('status'); if (dead || opening !== session) return;
      ready = tools.ready; if (!$('#folder').value) $('#folder').value = tools.folder;
      if (ready) await automaticSource(current);
      else status('Instale a versão leve uma vez. Ela substitui FFmpeg e Deno e baixa o formato original.');
    });
  }
  api.on(button, 'click', open);
  api.on(document, 'keydown', event => {
    if (!host || host.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    if (event.key === 'Tab') {
      const focusable = [...root.querySelectorAll('button,input,select,summary')].filter(n => !n.disabled && !n.hidden && n.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && root.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && root.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  attach();
  // A small poll tolerates Spotify replacing the widget without observing every page mutation.
  api.interval(attach, 1000);
  api.onCleanup(() => { dead = true; operationController?.abort(); session++; close(); button.remove(); host?.remove(); });
} });
