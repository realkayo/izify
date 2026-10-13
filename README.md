# Izify

Mod JavaScript para o Spotify Desktop. A interface mantém o painel compacto
original, com a logo ASCII, boas-vindas em roxo, abas Plugins e Dev e um seletor
de fontes com prévias. Não há arquivos ou dependências Python no projeto.

## Executar agora

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

## Instalar

Instalação local, com comando `izify` disponível em um novo terminal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
izify -Watch
```

O instalador copia apenas JS, CSS, assets e scripts PowerShell para
`%LOCALAPPDATA%\Izify`, cria o comando `izify` e adiciona essa pasta ao PATH do
usuário. Não instala Python ou Node e não modifica os arquivos do Spotify.

Depois que os arquivos deste projeto forem publicados na branch `main` de
[realkayo/izify](https://github.com/realkayo/izify), a instalação remota será:

```powershell
irm https://raw.githubusercontent.com/realkayo/izify/main/install.ps1 | iex
izify -Watch
```

O instalador remoto baixa todos os arquivos de um mesmo commit antes de atualizar
a instalação. Não é necessário publicar `dist/`, que é gerado a partir do código.
O repositório estava vazio durante esta implementação; o comando remoto depende
da publicação desses arquivos.

## Interface e plugins

O botão de paleta abre o painel original. **Ctrl+Shift+I** abre/fecha Izify;
**Ctrl+Shift+D** abre Dev. **Esc** fecha o painel.

As abas Cores, Fundo, Estilo, Esconder e Avançado foram preservadas. Plugins permite
importar um `.js`, ver nome, descrição, autor e versão, ativar, desativar e excluir.
O adblock é o primeiro plugin integrado; pode ser restaurado após a exclusão.
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
- `plugins/ad-block.js`: adblock; `probe.js`: diagnóstico.
- `run.ps1`, `install.ps1`, `build.ps1` e `tools/`: execução e empacotamento.
- `tools/inspect.ps1`: executar um diagnóstico JS no Spotify XPUI aberto via CDP.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\headless.ps1
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
