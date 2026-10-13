/* @izify-plugin {"id":"example","name":"Meu primeiro addon","description":"Modelo de addon com logs e limpeza automática.","author":"Seu nome","version":"1.0.0"} */
izify.registerPlugin({
  id: 'example',
  start(api) {
    api.log.info('Addon iniciado.');
    api.style('[data-testid="now-playing-widget"] img { outline: 1px solid #ed52d3; }');
    api.on(document, 'visibilitychange', () => api.log.debug('Janela visível:', !document.hidden));
    return () => api.log.info('Addon encerrado.');
  },
});
