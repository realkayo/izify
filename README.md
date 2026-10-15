# Izify

Mod JavaScript para o Spotify Desktop. A interface mantém o painel compacto
original, com a logo ASCII, boas-vindas em roxo, Plugins e fontes exibidas com
sua própria tipografia. Dev aparece após 10 cliques na versão do rodapé.
Não há arquivos ou dependências Python no projeto.

O modo **Leve** fica em **Avançado → Desempenho**. Mudanças, medições reais e
instruções para repetir os benchmarks estão em [DESEMPENHO.md](DESEMPENHO.md).

## Instalar com um comando

O Izify aceita apenas o Spotify Desktop do instalador oficial:
[baixar SpotifySetup.exe](https://download.scdn.co/SpotifySetup.exe).
A versão da Microsoft Store não é suportada.

Em um PC Windows com essa versão instalada, o comando público será:

```powershell
irm https://raw.githubusercontent.com/realkayo/izify/main/install.ps1 | iex
```

Essa única execução baixa o pacote, detecta o Spotify, cria o launcher, configura
os atalhos e o início automático e reinicia o Spotify Desktop com o Izify ao final.
Nas próximas vezes, basta abrir o Spotify. Os caminhos são calculados a partir do usuário que instala;
nenhuma configuração depende desta máquina ou da pasta do projeto.
A instalação também funciona com a política padrão `Restricted` do PowerShell,
sem mudar a política do Windows. O launcher executa seus scripts com `Bypass`
apenas nos processos do Izify.

Para o comando público funcionar, `install.ps1` e os arquivos do pacote precisam
estar acessíveis na branch `main` de [realkayo/izify](https://github.com/realkayo/izify).
Na última verificação, a API pública desse repositório respondeu 404.

## Executar durante o desenvolvimento

No diretório do projeto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 -Watch
```

Não é necessário instalar Python, Node ou módulos PowerShell. O launcher usa o
PowerShell 5.1 e o .NET presentes no Windows. Ele inicia o Spotify com CDP em
localhost e carrega o pacote JavaScript. Se o Spotify já estiver aberto sem CDP,
pergunta antes de reiniciá-lo. `-Restart` autoriza esse reinício diretamente.

`-Watch` também acompanha alterações nos arquivos do projeto. Sem essa opção,
o runner continua acompanhando recarregamentos da página. `-Once` injeta e sai;
`Ctrl+C` encerra o acompanhamento. O mod fica no renderer até o Spotify fechar
ou recarregar. O Spotify Desktop instalado precisa aceitar a porta de depuração.

## Instalação a partir do projeto local

Instalação local, com comando `izify` disponível em um novo terminal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

O instalador copia apenas JS, CSS, assets e scripts PowerShell para
`%LOCALAPPDATA%\Izify`, cria o comando `izify` e adiciona essa pasta ao PATH do
usuário. Não instala Python ou Node e não modifica os arquivos do Spotify.
Também cria/ajusta os atalhos **Spotify** na área de trabalho e menu Iniciar,
mantendo o ícone do aplicativo, e cria `Izify.lnk` na pasta Inicializar do Windows.
O instalador compila um pequeno launcher nativo usando o .NET do próprio Windows.
Ao clicar em Spotify, esse launcher abre o app com depuração local e inicia o
monitor oculto; não aparece terminal e não é necessário executar comandos novamente.
O início automático no login também usa esse launcher. Um monitor PowerShell carrega o Izify sempre
que o Spotify abre e após recarregamentos, sem precisar manter o terminal aberto.
O monitor não abre, fecha ou reinicia o Spotify sozinho. Se uma abertura direta
não expuser CDP, mantém o app aberto e aguarda. Após 45 segundos, registra o motivo
em `auto-start.log` e `auto-start-status.json`. Os atalhos ajustados passam pelo
launcher, que fornece os argumentos de depuração na abertura do app.
O instalador rejeita a Microsoft Store antes de alterar arquivos, atalhos ou
processos e mostra o link direto do Spotify Desktop. Não há tentativa de abrir
aliases, executar arquivos protegidos ou injetar o Izify no cliente da Store.
Apenas a logo ASCII usa rosa pastel (`#ffa8d1`, com fallback magenta em terminais
sem cores RGB). Os logs usam a cor padrão; erros são vermelhos.
Ao concluir uma instalação válida, somente os processos do executável Desktop
selecionado são reiniciados. Falhas do monitor não encerram o Spotify.
Em falhas de instalação, a mensagem fica visível e a janela aguarda Enter.
`-NoPauseOnError` é reservado para execução não interativa/testes. O comando
`izify.cmd` também pausa em erros; falhas no launcher abrem um console que
permanece aberto com o diagnóstico, sem tentar iniciar o Spotify novamente.
Os destinos e argumentos originais são guardados em `spotify-shortcuts.json`.
`-NoAutoStart` pula a configuração automática, útil em instalações de teste.
Para desativar o início automático, remova `Izify.lnk` de `shell:startup`
e encerre o monitor; `auto-start.log` registra falhas de carregamento.

O instalador remoto baixa todos os arquivos de um mesmo commit antes de atualizar
a instalação. Não é necessário publicar `dist/`, que é gerado a partir do código.

## Desinstalar

```powershell
izify uninstall
```

O desinstalador encerra os processos do Izify, remove seu início automático e
entrada no PATH do usuário, restaura os atalhos originais e apaga apenas os
arquivos registrados pela instalação. Atalhos criados pelo Izify passam a abrir
o Spotify diretamente. Alterações posteriores do usuário nos atalhos são preservadas.
Também tenta retirar a UI e os hooks da página aberta sem encerrar o Spotify.
Se a depuração não estiver disponível, basta fechar e abrir o Spotify para a UI sair.
Preferências e plugins salvos no armazenamento do Spotify ficam preservados.

Também pode executar `uninstall.ps1` da instalação com PowerShell. Falhas mantêm
a mensagem visível e aguardam Enter, como no instalador. O código-fonte do projeto
e arquivos extras do usuário na pasta instalada não são apagados.

## Interface e plugins

O botão de paleta abre o painel original. **Ctrl+Shift+I** abre/fecha Izify;
**Ctrl+Shift+D** abre Dev após desbloquear com 10 cliques em **Izify · v2.4.0**
no rodapé. O desbloqueio dura até o renderer recarregar. **Esc** fecha o painel.

As abas são Cores, Fundo, Estilo, Plugins e Avançado. Cores reúne dez presets
completos: Spotify, Izify, **Kuromi**, **Gaara**, Oceano, Sunset, Rosa, AMOLED, Claro, Névoa
e Café. Cada preset aplica paleta, áreas, fundo e formato; a prévia acompanha os
ajustes. Kuromi tem fundo preto ilustrado, detalhes rosa e lilás, cabeça PNG no
botão Izify e no marcador nativo do progresso. Os assets são locais e embutidos
no bundle, disponíveis offline. Em Fundo e Estilo, cada detalhe especial pode
ser ativado separadamente. As artes e os prompts estão em `assets/themes/kuromi`.
Gaara tem composição própria com o selo **愛**, capa ilustrada para Favoritas,
marcador de progresso em forma de selo e cabaça no volume. Na Home, o refúgio
de Sunagakure oferece três atmosferas: **Crepúsculo**, **Dunas** e **Suna à noite**.
Nas letras, o Gaara fofinho acompanha a linha ativa sobre uma cena fixa; o botão
**Foco nas letras** destaca o verso atual e escurece o cenário. Em **Estilo →
Gaara · Arte da Areia**, é possível alternar atmosfera, Home especial, contornos,
símbolos e foco. Não há partículas em loop nem dependência de fontes externas.
O preset **Spotify** usa os estilos originais do aplicativo: desliga a adaptação
de cores e remove fundo, CSS de tema e CSS personalizado aplicado. O CSS salvo
é preservado para outros temas. Alterar um controle visual sai do modo original
e ativa um tema personalizado; **Restaurar padrão** também volta ao Spotify puro.

Além das cores principais, é possível ajustar botões, bordas, hover, seleção,
tooltips, rolagem e sombras. As áreas incluem biblioteca, navegação, conteúdo,
painel direito, player, progresso, volume, menus e busca. Estilo inclui fontes,
tamanho e espaçamento do texto, cantos de painéis/cartões/capas/botões, espaço
entre painéis, altura das faixas e espessura das barras. Fundo aceita imagem local
ou URL, gradiente, estampas, filtros, opacidade e vidro. Os presets substituem os
ajustes visuais anteriores; salve um perfil para conservar sua combinação.
CSS e JavaScript personalizados permanecem preservados.

**Importar color.ini** lê paletas com valores hex ou RGB e permite alternar as
seções do arquivo. Isso importa as cores, não instala Spicetify, não executa
theme.js e não carrega extensões do Marketplace. Os aliases `--spice-*` ficam
disponíveis para CSS personalizado, junto das variáveis `--izify-color-*`.

O motor em `src/core/themes.js` foi escrito para o Izify após pesquisa da
[documentação de temas](https://spicetify.app/docs/development/themes) e do
[pré-processador do Spicetify](https://github.com/spicetify/cli/blob/main/src/preprocess/preprocess.go).
Ele adapta declarações de cor do CSS carregado em tempo de execução e reconhece
áreas pelos nomes do grid, mesmo quando as classes do Spotify são ofuscadas.
Preserva media queries, capas e estilos de erro; acompanha folhas de estilo
carregadas depois da inicialização. Não modifica os arquivos do Spotify.
Não promete mudar toda interface nativa: janelas do sistema, anúncios isolados,
conteúdo em iframes e CSS inacessível continuam sujeitos às limitações do cliente.
`izify.themeStatus()` informa a cobertura e `izify.applyPreset('kuromi')` aplica um tema.
`src/core/personalization.js` centraliza aplicação, limpeza, ícone do Izify,
assets e eventos. A API `izify.personalization` oferece `listPresets()`,
`getState()`, `applyPreset(id)`, `set(path, value)`, `reset()`, `getStatus()`,
`getAsset(name)` e `subscribe(callback)` (retorna uma função para remover o evento).
Os assets incluem `kuromiHead`, `kuromiWallpaper`, `kuromiLikedSongs`, `gaaraHead`,
`gaaraWallpaper`, `gaaraSeal`, `gaaraGourd` e `gaaraLikedSongs`. As identidades
ficam em `decor.icon`, `decor.wallpaper` e `decor.progressHandle`
(`none`/`kuromi`/`gaara`). Gaara também usa `decor.gaaraAtmosphere`
(`dusk`/`dunes`/`night`/`custom`), `decor.gaaraHome`, `decor.gaaraSand`,
`decor.gaaraSeal` e `decor.gaaraFocus`. A seleção de atmosfera atualiza a paleta
pela mesma API `izify.set`, sem apagar as demais opções do tema.
Os estilos de tema não forçam a pintura dos botões de play: hover, foco e
visibilidade continuam controlados pelo Spotify. O ícone do Izify usa suas
próprias cores para evitar herdar cores de ícones nativos ao trocar de tema.
Preferências inválidas são normalizadas; as antigas opções de esconder capas
e de formato do v1 continuam removidas para evitar efeitos inesperados.
Plugins permite
importar um `.js`, ver nome, descrição, autor e versão, ativar, desativar e excluir.
O adblock é o primeiro plugin integrado. Os cartões mostram metadados, estado,
um interruptor para ativar/desativar e Excluir. Não há botão Restaurar adblock.
Ocultar Upgrade to Premium faz parte do adblock e fica sempre ativo enquanto
o plugin estiver ligado. Seletores de anúncio preservam capas e seus contêineres.
O **Izify Download** também é integrado: o ícone de download aparece ao lado das
informações da faixa na barra inferior. Clique para abrir o menu roxo: o plugin
identifica a faixa atual (inclusive pelo link/ID do Spotify quando disponível),
busca uma fonte no YouTube e verifica automaticamente áudio e vídeo. Confira a
fonte encontrada, escolha áudio M4A/WebM ou vídeo MP4 com som (quando disponível)
e informe a pasta de saída. A versão leve baixa o arquivo original: não converte
para MP3 e não une trilhas de vídeo e áudio separadas. Cada opção só fica ativa
quando a fonte oferece o respectivo formato pronto.
O arquivo vem da fonte selecionada; não é uma exportação do áudio protegido do
Spotify. A disponibilidade depende da fonte e do YouTube.
**Trocar fonte** permite escolher outra versão ou colar um link de vídeo. A fonte
é reutilizada ao reabrir a mesma faixa durante a sessão; mudar de música dispara
uma nova identificação. O link do Spotify identifica a faixa, não um arquivo de áudio.

Na primeira utilização, **Instalar versão leve** baixa os executáveis oficiais
de [yt-dlp](https://github.com/yt-dlp/yt-dlp),
[QuickJS-NG](https://github.com/quickjs-ng/quickjs) para `%LOCALAPPDATA%\Izify\download-tools`
(aproximadamente 20 MB nas versões atuais). O yt-dlp já instalado é reutilizado.
A instalação retira apenas os executáveis ffmpeg.exe, ffprobe.exe e deno.exe
do pacote anterior dessa pasta. Arquivos baixados pelo usuário são preservados.
Não requer Python, Node, administrador ou mudanças no PATH. O destino padrão é
`Downloads\Izify`; o campo aceita outro caminho local completo. A qualidade é
a do arquivo original, sem recodificação. Busca e identificação têm limites de
15 e 30 segundos, respectivamente; o botão **Cancelar** encerra a operação local.
O runner/monitor precisa permanecer ativo: abra pelo launcher Izify ou use
`run.ps1` sem `-Once`. A comunicação usa o CDP local existente, sem outro servidor.
Desativar o plugin remove o botão/menu e cancela a operação pendente; fechar
somente o menu permite que o download continue. Os arquivos já salvos permanecem.
O ícone SVG de 18 px é derivado de [Lucide](https://lucide.dev/icons/download),
armazenado localmente e incorporado ao plugin, com licença em `assets/icons/LICENSE`.
Dev reúne os logs de todos os addons, com filtros, busca, pausa, cópia/exportação,
estado do adblock, scan DOM e probe. A ampliação do console é opcional.

Use `plugins/example.js` como modelo. O cabeçalho `@izify-plugin` contém os
metadados; o arquivo registra um objeto com `id` e `start(api)`. Arquivos novos
começam desativados. `api.log` e o `console` do arquivo aparecem em Dev.
`api.timeout`, `interval`, `on`, `observe`, `style` e `patch` são limpos ao
desativar. `api.onCleanup` e o retorno de `start` registram outras limpezas.
Plugins executam na página: use código confiável e a API para gerenciar recursos.

O adblock encontra o transporte Esperanto e o player pelo registro interno do
Spotify, inclusive nas versões que não expõem `req.c`. Desativa e limpa o
inventário dos slots nativos e intercepta `GetAds` antes do envio, devolvendo a
resposta protobuf de inventário vazio. Tentativas de reativar slots pelo mesmo
transporte continuam desativadas. Usa apenas o override local `ads=0`; não
modifica o plano ou os campos de produto/catálogo da conta.

Não há automação de cliques, mute, próxima faixa ou retomada da reprodução.
Um anúncio que já tinha sido carregado pode continuar representado no player;
o bloqueio de novas requisições não apaga o áudio já armazenado. O diagnóstico
mostra o player nativo, pausa, slots desativados e requisições bloqueadas.
Desativar o plugin restaura o transporte e os flags de slots capturados.

## Arquivos e verificação

- `izify-ui.js`: UI original com os pontos de integração.
- `src/ui.css` e `src/panel-extras.js`: estilos e seções adicionais do painel.
- `src/core/`: logs, armazenamento e ciclo de vida dos plugins.
- `src/core/themes.js`: presets, adaptação do CSS nativo, fundos e importação de paletas.
- `plugins/ad-block.js`: adblock; `probe.js`: diagnóstico.
- `run.ps1`, `install.ps1`, `build.ps1` e `tools/`: execução e empacotamento.
- `tools/inspect.ps1`: executar um diagnóstico JS no Spotify XPUI aberto via CDP.
- `tools/inspect-download.js`: diagnóstico somente de leitura do player, fontes
  de mídia no DOM e presença de resolução de CDN/CENC/Widevine no código carregado.
  Não retorna tokens, cookies, chaves de áudio ou URLs assinadas; não altera reprodução.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\headless.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\download.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\auto-start.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\installer.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\installer.ps1 -RejectStore
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\uninstall.ps1
```

Se existir uma pasta `archive`, ela guarda apenas backups locais e pode ser
apagada: o runner e o instalador não a utilizam.

Os testes usam Chrome headless em um perfil separado e uma página simulada;
nunca abrem o Spotify. Verificam o painel compacto, transporte inválido e válido,
plugins, limpeza, logs, fontes, persistência, responsividade, registro nativo sem
cache público, bloqueio de GetAds e restauração dos flags. As capturas ficam
em `.test-artifacts/compact`.

Na validação com o Spotify aberto, o registro nativo foi identificado, 14 slots
foram desativados, o anúncio saiu do inventário ativo e uma solicitação GetAds
retornou inventário vazio sem chegar ao transporte. Pausa e posição foram
preservadas. A reprodução contínua após a retomada ainda requer observação;
a compatibilidade também depende de futuras versões do Spotify.
