# Izify

Temas e plugins para o Spotify Desktop no Windows. Inclui Kuromi, Gaara,
personalizacao de cores, letras e controles, alem do painel de plugins.

## Instalar no seu PC

1. Instale o [Spotify Desktop do site oficial](https://download.scdn.co/SpotifySetup.exe).
   A versao da Microsoft Store nao e suportada.
2. Baixe e extraia **todo o ZIP** para uma pasta. Nao execute de dentro do ZIP.
3. Abra **instalar.bat**. Nao precisa executar como administrador.

O instalador calcula os caminhos deste PC, copia o Izify para
`%LOCALAPPDATA%\Izify`, cria o launcher e configura os atalhos. Ao concluir,
reinicia o Spotify Desktop para carregar o mod. Depois, abra o Spotify pelo
atalho configurado pelo Izify.

Tambem e possivel instalar pelo PowerShell, dentro desta pasta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

O pacote nao inclui preferencias, contas, cookies, plugins importados, backups
de atalhos ou configuracoes de quem o publicou. Temas oficiais e assets sao
parte do produto; as suas escolhas ficam salvas localmente no seu perfil.
O Spotify precisa estar instalado separadamente. O launcher e compilado neste
PC com o .NET do Windows; nenhum executavel pessoal e distribuido.

## Personalizar

Use o botao do Izify na barra superior. Gaara oferece atmosferas de Sunagakure,
selo 愛, cabaca no volume e foco nas letras. O tema Spotify restaura a aparencia
nativa. Kuromi inclui suas artes, icones e marcadores de letras.

##gerar outra build

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 -Watch
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
```

`-Watch` pertence a `run.ps1`, nao a `install.ps1`.
O projeto usa PowerShell 5.1 e .NET do Windows, sem Node ou Python.


```powershell
irm https://raw.githubusercontent.com/realkayo/izify/main/install.ps1 | iex
```

Para desinstalar uma instalacao existente: `izify uninstall`.
Se houver erro, envie a mensagem completa exibida na janela. Evite compartilhar
pastas do Spotify ou o conteudo da sua instalacao em AppData.
