/* Izify's runtime theme engine. No Spicetify code or patched Spotify files required. */
(() => {
  'use strict';
  const M = window.__izifyModules ||= {};
  const copy = value => JSON.parse(JSON.stringify(value));
  const rgb = hex => [1,3,5].map(index => parseInt(hex.slice(index,index+2),16));
  const blend = (left,right,weight) => '#' + rgb(left).map((value,index) => Math.round(value*(1-weight)+rgb(right)[index]*weight).toString(16).padStart(2,'0')).join('');
  const alpha = (hex,opacity) => `rgba(${rgb(hex).join(',')},${opacity})`;
  const ink = hex => rgb(hex).reduce((sum,value,index)=>{const channel=value/255;return sum+(channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4)*[.2126,.7152,.0722][index];},0)>.179 ? '#121212' : '#ffffff';
  M.themeOnColor=ink;
  // Character assets share one lifecycle across presets, sliders, cover art and lyrics.
  M.themeCharacters={kuromi:{head:'kuromiHead',wallpaper:'kuromiWallpaper',cover:'kuromiLikedSongs'},gaara:{head:'gaaraHead',icon:'gaaraSeal',handle:'gaaraSeal',wallpaper:'gaaraWallpaper',cover:'gaaraLikedSongs'}};
  M.themeCharacter=state=>state.preset==='spotify'?'':M.themeCharacters[state.preset]?state.preset:state.preset==='custom'&&M.themeCharacters[state.decor?.wallpaper]?state.decor.wallpaper:'';
  M.characterAsset=(id,kind)=>M.assetURL(M.themeCharacters[id]?.[kind]);
  const baseStyle = { font:'',letterSpacing:0,noAnim:false,surfaceRadius:8,cardRound:8,coverRound:4,buttonRound:24,rowHeight:56,gapSize:8,fontScale:100,progressHeight:4,albumTint:true,borders:false,shadows:false };
  const baseBg = {image:'',blur:0,dim:35,brightness:100,saturate:100,fit:'cover',position:'center',panelOpacity:100,glass:0,gradient:false,g1:'#1ed760',g2:'#121212',gAngle:160,pattern:'none',patternOpacity:20};
  const baseAreas = { sidebar:'',topbar:'',main:'',rightbar:'',player:'',progress:'',volume:'',menus:'',search:'' };
  const baseDecor = {icon:'none',wallpaper:'none',progressHandle:'none',gaaraAtmosphere:'dusk',gaaraHome:true,gaaraSand:true,gaaraSeal:true,gaaraFocus:false};
  function preset(name,description,accent,bg,panel,card,text,subtext,options={}) {
    return {name,description,colors:{accent,bg,panel,card,text,subtext,border:blend(panel,text,.16),hover:blend(card,text,.1),selection:accent,button:accent,tooltip:card,scrollbar:blend(panel,text,.32),shadow:'#000000'},
      areas:{...baseAreas,...options.areas},bg:{...baseBg,g1:accent,g2:bg,...options.bg},style:{...baseStyle,...options.style},decor:{...baseDecor,...options.decor}};
  }
  M.themePresets = {
    spotify:preset('Spotify','Visual original, sem alterações.','#1ed760','#000000','#121212','#1f1f1f','#ffffff','#b3b3b3'),
    izify:preset('Izify','Lavanda, vidro e espaço para respirar.','#b59aff','#090612','#171025','#241a38','#f7f2ff','#b8a9cf',{bg:{gradient:true,g1:'#39204e',g2:'#090612',panelOpacity:94,dim:12},style:{surfaceRadius:16,cardRound:12,borders:true}}),
    kuromi:preset('Kuromi','Preto, Kuromi e detalhes rosa e lilás.','#cfa6ff','#000000','#09090d','#141218','#fff1ff','#c1b4cd',{areas:{player:'#000000',topbar:'#000000'},bg:{gradient:false,pattern:'kuromi',patternOpacity:54,dim:0,brightness:150,panelOpacity:51,glass:10,gAngle:0},style:{surfaceRadius:18,cardRound:14,coverRound:12,albumTint:false,borders:true,shadows:true},decor:{icon:'kuromi',wallpaper:'kuromi',progressHandle:'kuromi'}}),
    oceano:preset('Oceano','Azul profundo e brilho suave.','#56d7ef','#041016','#0b202b','#14313f','#edfcff','#9fc4d2',{bg:{gradient:true,g1:'#123e4b',g2:'#041016',dim:10,panelOpacity:95},style:{surfaceRadius:14,cardRound:12}}),
    sunset:preset('Sunset','Pêssego, terracota e tons quentes.','#ffb383','#1a0d11','#29171c','#3a242a','#fff4e9','#d8b3a9',{bg:{gradient:true,g1:'#502833',g2:'#1a0d11',dim:10,panelOpacity:95},style:{surfaceRadius:14,cardRound:12}}),
    gaara:preset('Gaara','Selo 愛, dunas e as noites de Sunagakure.','#e9b86c','#140f0d','#211915','#30231c','#fff1db','#cbb39b',{areas:{player:'#140f0d',topbar:'#140f0d'},bg:{dim:20,panelOpacity:94,glass:0},style:{surfaceRadius:8,cardRound:6,coverRound:4,buttonRound:8,albumTint:false,borders:true,shadows:false},decor:{icon:'gaara',wallpaper:'gaara',progressHandle:'gaara'}}),
    rosa:preset('Rosa','Rosa delicado sobre ameixa.','#ff9fce','#160a13','#261323','#392039','#fff3fa','#d1aec8',{bg:{gradient:true,g1:'#4d2544',g2:'#160a13',dim:12,panelOpacity:95},style:{surfaceRadius:18,cardRound:14,coverRound:12}}),
    amoled:preset('AMOLED','Preto real, detalhes discretos.','#b9a6ff','#000000','#000000','#0b0b0e','#ffffff','#a3a0ad',{style:{surfaceRadius:10,albumTint:false}}),
    claro:preset('Claro','Superfícies claras e texto com contraste.','#6b4cc4','#e9e6ef','#faf8fd','#ffffff','#241d31','#625a70',{areas:{player:'#f4f0fa'},style:{surfaceRadius:14,cardRound:12,albumTint:false,borders:true}}),
    nord:preset('Névoa','Cinzas azulados e acento gelo.','#a6cee3','#18212c','#232f3d','#304052','#f0f5fc','#b0bed0',{style:{surfaceRadius:12,cardRound:10,albumTint:false,borders:true}}),
    cafe:preset('Café','Creme, chocolate e leitura confortável.','#ddb993','#17120f','#251e18','#352a22','#f8efdf','#bca895',{style:{surfaceRadius:12,cardRound:10,albumTint:false}}),
  };
  M.themeDefaults = {colors:copy(M.themePresets.spotify.colors),areas:copy(baseAreas),bg:copy(baseBg),style:copy(baseStyle),decor:copy(baseDecor)};
  M.themeColorKeys = Object.keys(M.themeDefaults.colors);
  M.normalizeTheme = state => {
    for (const group of ['colors','areas','bg','style','decor']) {
      if (!state[group] || typeof state[group]!=='object' || Array.isArray(state[group])) state[group]={};
      for (const [key,value] of Object.entries(M.themeDefaults[group])) if (state[group][key]===undefined) state[group][key]=copy(value);
    }
    for (const group of ['colors','areas']) for (const key of Object.keys(M.themeDefaults[group])) {
      const value = state[group][key];
      if (group==='areas' && value==='') continue;
      state[group][key]=typeof value==='string' && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value) ? (value.length===4?'#'+[...value.slice(1)].map(c=>c+c).join(''):value).toLowerCase() : M.themeDefaults[group][key];
    }
    const limits = {'bg.blur':[0,40],'bg.dim':[0,90],'bg.brightness':[20,150],'bg.saturate':[0,200],'bg.panelOpacity':[20,100],'bg.glass':[0,40],'bg.gAngle':[0,360],'bg.patternOpacity':[0,60],'style.letterSpacing':[-1,4],'style.surfaceRadius':[0,28],'style.cardRound':[0,28],'style.coverRound':[0,32],'style.buttonRound':[0,32],'style.rowHeight':[40,80],'style.gapSize':[0,20],'style.fontScale':[85,125],'style.progressHeight':[2,10]};
    for (const [path,[min,max]] of Object.entries(limits)) { const [group,key]=path.split('.');state[group][key]=Number.isFinite(Number(state[group][key]))?Math.max(min,Math.min(max,Number(state[group][key]))):M.themeDefaults[group][key]; }
    for (const [group,keys] of [['style',['noAnim','albumTint','borders','shadows']],['bg',['gradient']]]) for (const key of keys) state[group][key]=state[group][key]===true;
    for (const [key,values] of Object.entries({fit:['cover','contain','tile'],position:['center','top','bottom','left','right'],pattern:['none','kuromi','stars','dots']})) if (!values.includes(state.bg[key])) state.bg[key]=M.themeDefaults.bg[key];
    for (const key of ['g1','g2']) if (!/^#[\da-f]{6}$/i.test(state.bg[key])) state.bg[key]=M.themeDefaults.bg[key];
    state.style.font=typeof state.style.font==='string'?state.style.font.replace(/["\\;{}<>\r\n]/g,'').slice(0,100):'';
    if (typeof state.bg.image!=='string' || !/^(?:https?:\/\/|data:image\/|$)/i.test(state.bg.image)) state.bg.image='';
    for(const key of ['icon','wallpaper','progressHandle'])if(!['none',...Object.keys(M.themeCharacters)].includes(state.decor[key]))state.decor[key]='none';
    for(const key of ['gaaraHome','gaaraSand','gaaraSeal','gaaraFocus'])state.decor[key]=state.decor[key]===true;
    if(!['dusk','dunes','night','custom'].includes(state.decor.gaaraAtmosphere))state.decor.gaaraAtmosphere='dusk';
    return state;
  };
  const S = M.themeSelectors = {
    layout:'.Root__top-container',
    main:'.Root__main-view, [data-testid="main-view"], [data-testid="main-view-container"]',
    sidebar:'.Root__nav-bar, [data-testid="left-sidebar"], [data-testid="your-library"]',
    rightbar:'.Root__right-sidebar, [data-testid="right-sidebar"], [data-testid="now-playing-view"]',
    player:'.Root__now-playing-bar, [data-testid="now-playing-bar"]',
    topbar:'.Root__globalNav, [data-testid="global-nav"]',
    card:'.main-card-card, [data-testid="card"], [data-testid="card-container"], [data-testid="grid-container"] [role="listitem"]',
    menus:'[role="menu"], [role="dialog"]:not(.izify-dialog), [data-radix-popper-content-wrapper]',
    search:'[data-testid="search-input"], input[role="combobox"], .main-search-searchInput',
    progress:'.playback-progressbar, [data-testid="playback-progressbar"], [data-testid="progress-bar"]',
    volume:'.main-nowPlayingBar-volumeBar, [data-testid="volume-bar"], [data-testid="progress-bar"]:not([data-testid="playback-progressbar"] [data-testid="progress-bar"])',
    covers:'img[data-testid="cover-art-image"], [data-testid="cover-art"] img',
    rows:'[data-testid="tracklist-row"], .main-trackList-trackListRow',
  };
  M.themeVariables = state => {
    const c=state.colors,op=state.bg.panelOpacity/100;
    const values={};
    for(const key of M.themeColorKeys) { const value=c[key];values['--izify-color-'+key]=['panel','bg'].includes(key)?alpha(value,op):value;values['--izify-rgb-'+key]=rgb(value).join(','); }
    Object.assign(values,{'--background-base':alpha(c.panel,op),'--background-highlight':c.hover,'--background-press':c.bg,'--background-elevated-base':c.card,'--background-elevated-highlight':c.hover,'--background-elevated-press':c.panel,'--background-tinted-base':alpha(c.text,.08),'--background-tinted-highlight':alpha(c.text,.14),'--background-tinted-press':alpha(c.text,.05),'--text-base':c.text,'--text-subdued':c.subtext,'--text-bright-accent':c.accent,'--text-negative':'#f17387','--text-positive':c.accent,'--essential-base':c.text,'--essential-subdued':c.subtext,'--essential-bright-accent':c.accent,'--decorative-base':c.text,'--decorative-subdued':c.border,'--text-on-accent':ink(c.button),'--izify-on-button':ink(c.button)});
    const aliases={text:c.text,subtext:c.subtext,main:c.panel,sidebar:state.areas.sidebar||c.panel,player:state.areas.player||c.panel,card:c.card,'main-elevated':c.card,'card-elevated':c.hover,highlight:c.hover,'highlight-elevated':c.hover,button:c.button,'button-active':c.accent,'button-disabled':c.subtext,'tab-active':c.hover,misc:c.border,shadow:c.shadow,'selected-row':c.selection,notification:c.accent,'notification-error':'#f17387'};
    for(const [name,value] of Object.entries(aliases)){values['--spice-'+name]=value;values['--spice-rgb-'+name]=rgb(value).join(',');}
    return values;
  };
  M.buildThemeCSS = state => {
    if(state.preset==='spotify')return '';
    const c=state.colors,a=state.areas,b=state.bg,st=state.style;
    const vars=Object.entries(M.themeVariables(state)).map(([key,value])=>`${key}:${value}!important`).join(';');
    const surface=name=>`${S[name]}{background-color:var(--izify-color-panel)!important;border-radius:${st.surfaceRadius}px!important;${st.borders?`border:1px solid ${c.border}!important;`:''}${st.shadows?`box-shadow:0 8px 28px ${alpha(c.shadow,.22)}!important;`:''}${b.glass?`backdrop-filter:blur(${b.glass}px);-webkit-backdrop-filter:blur(${b.glass}px);`:''}}`;
    const area=(name,value)=>value?`${S[name]}{--izify-color-panel:${alpha(value,b.panelOpacity/100)}!important;--izify-color-bg:${alpha(value,b.panelOpacity/100)}!important;--background-base:${alpha(value,b.panelOpacity/100)}!important;background-color:${alpha(value,b.panelOpacity/100)}!important}`:'';
    const bars=(name,value)=>`:is(${S[name]}),:is(${S[name]}) [data-testid="progress-bar"]{--izify-color-accent:${value||c.accent}!important;--fg-color:${value||c.accent}!important;--is-active-fg-color:${value||c.accent}!important;--progress-bar-active-color:${value||c.accent}!important;--progress-bar-height:${st.progressHeight}px!important}`;
    const character=M.themeCharacter(state),head=M.characterAsset(state.decor.progressHandle,'handle')||M.characterAsset(state.decor.progressHandle,'head'),cover=M.characterAsset(character,'cover');
    const lyricBg=character==='gaara'?c.bg:'#070609',wallpaper=M.isLightMode?.()?'':M.characterAsset(character,'wallpaper');
    const hasBg=!!b.image||b.gradient||b.pattern!=='none'||!M.isLightMode?.()&&state.decor.wallpaper!=='none';
    return `:root,body,.encore-dark-theme,.encore-light-theme,.encore-base-set{${vars}}
      html,body{background-color:${c.bg}!important;color:${c.text}!important} html{font-size:${16*st.fontScale/100}px!important}
      #main{position:relative;z-index:1} ${hasBg?`.Root,#main,${S.layout}{background:transparent!important}`:''}
      ${['main','sidebar','rightbar','player','topbar'].map(surface).join('\n')}
      ${Object.entries(a).filter(([name])=>S[name]&&!['progress','volume'].includes(name)).map(([name,value])=>area(name,value)).join('\n')}
      /* The page header fades its own background with scroll. Never paint its container. */
      [data-testid="topbar"],.main-topBar-container{background:transparent!important;border:0!important;box-shadow:none!important}
      [data-testid="topbar"] > [style*="--background-base"],.main-topBar-background{--background-base:${blend(a.main||c.panel,c.accent,.12)}!important;background-color:${blend(a.main||c.panel,c.accent,.12)}!important;border-radius:${st.surfaceRadius}px ${st.surfaceRadius}px 0 0!important}
      [data-testid="overscroll-background"]{background-color:${a.main||c.panel}!important}
      ${S.card}{background-color:${c.card}!important;border-radius:${st.cardRound}px!important}
      :is(${S.card}):hover{background-color:${c.hover}!important}
      ${S.menus}{background-color:${a.menus||c.card}!important;color:${c.text}!important;border:1px solid ${c.border}!important;border-radius:${st.cardRound}px!important}
      [role="menuitem"]:hover,[role="option"]:hover{background-color:${c.hover}!important}
      [role="tooltip"]{background:${c.tooltip}!important;color:${c.text}!important}
      ${S.search}{background-color:${a.search||c.card}!important;color:${c.text}!important;border:1px solid ${c.border}!important;border-radius:${st.buttonRound}px!important}
      .encore-bright-accent-set{--background-base:${c.button}!important;--background-highlight:${blend(c.button,c.text,.12)}!important;--text-base:${ink(c.button)}!important;--essential-base:${ink(c.button)}!important;--izify-color-accent:${c.button}!important;--izify-color-text:${ink(c.button)}!important}
      .encore-bright-accent-set *{--text-base:${ink(c.button)}!important;--essential-base:${ink(c.button)}!important}
      [data-testid="play-button"], [data-testid="play-button"] .encore-bright-accent-set{border-radius:${st.buttonRound}px!important}
      ${bars('progress',a.progress)} ${bars('volume',a.volume)}
      :is(${S.progress},${S.volume}) .x-progressBar-fillColor{background-color:var(--izify-color-accent)!important;height:${st.progressHeight}px!important}
      [data-testid="progress-bar"]{overflow:visible!important}
      :is(${S.progress},${S.volume}) [data-testid="progress-bar-handle"]{display:flex!important;visibility:visible!important;opacity:1!important}
      ${head?`:is(${S.progress},${S.volume}) [data-testid="progress-bar-handle"]{width:26px!important;height:26px!important;margin-left:-13px!important;margin-top:0!important;transform:translateY(-50%)!important;border-radius:0!important;background-color:transparent!important;background-image:url(${JSON.stringify(head)})!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;box-shadow:none!important}`:''}
      ${S.covers}{border-radius:${st.coverRound}px!important}
      ${S.rows}{min-height:${st.rowHeight}px!important;height:${st.rowHeight}px!important;border-radius:${Math.min(st.cardRound,8)}px!important}
      :is(${S.rows}):hover{background-color:${c.hover}!important}
      :is(${S.rows})[aria-selected="true"]{background-color:${alpha(c.selection,.2)}!important}
      ${S.layout}{gap:${st.gapSize}px!important;padding:${st.gapSize}px!important;--panel-gap:${st.gapSize}px!important}
      *{scrollbar-color:${c.scrollbar} transparent} ::-webkit-scrollbar-thumb{background-color:${c.scrollbar}!important;border-radius:8px}
      ::selection{background:${alpha(c.selection,.4)}!important;color:${c.text}!important}
      :root{--encore-text-size-smaller:${12*st.fontScale/100}px;--encore-text-size-base:${14*st.fontScale/100}px;--encore-text-size-larger:${16*st.fontScale/100}px;--encore-text-size-larger-2:${24*st.fontScale/100}px;${st.font?`--encore-body-font-stack:"${st.font}",sans-serif!important;--encore-title-font-stack:"${st.font}",sans-serif!important;`:''}}
      ${st.font?`body,button,input,textarea,select,[class*="encore-text"],h1,h2,h3,p,a{font-family:"${st.font}",var(--encore-body-font-stack,sans-serif)!important}`:''}
      ${st.letterSpacing?`body,[class*="encore-text"],h1,h2,h3,p,a,button{letter-spacing:${st.letterSpacing}px!important}`:''}
      ${!st.albumTint?`.main-entityHeader-backgroundColor,.main-actionBarBackground-background,[data-testid="entity-header"],[data-testid="playlist-header"]{background-color:${alpha(c.panel,b.panelOpacity/100)}!important;background-image:none!important}`:''}
      ${character?`
      /* Keep album-derived Home layers from drawing a hard purple rectangle. */
      div:has(> [data-testid="home-page"]) > div:not([data-testid]):not(:has(*)){background:none!important}
      div:has(> [data-testid="home-page"]) > div:not([data-testid]) [style*="--background-base"]{--background-base:${c.panel}!important}
      [data-testid="home-page"]{background:linear-gradient(${alpha(c.accent,.1)},transparent 320px)!important}
      [data-testid="home-page"] div:has(> [data-testid="shortcut-background"]){background:${c.card}!important;border:1px solid ${c.border}!important;border-radius:${Math.min(st.cardRound,12)}px!important;overflow:hidden}
      [data-testid="home-page"] [data-testid="shortcut-background"]{background:${alpha(c.accent,.1)}!important}
      [data-testid="home-page"] div:has(> [data-testid="shortcut-background"]):hover{background:${c.hover}!important}
      ${cover?`img[src^="https://misc.scdn.co/liked-songs/"]{content:url(${JSON.stringify(cover)})!important;object-fit:${character==='gaara'?'contain':'cover'}!important;${character==='gaara'?`background:linear-gradient(145deg,${c.card},${c.bg})!important;padding:8%!important;box-sizing:border-box!important;`:''}}
      [data-testid="entity-header"]:has(img[src^="https://misc.scdn.co/liked-songs/"]) > div:first-child{background:linear-gradient(135deg,${alpha(c.accent,.16)},${c.panel})!important}
      [data-testid="entity-header"]:has(img[src^="https://misc.scdn.co/liked-songs/"]) > div:nth-child(2){background:none!important}`:''}
      [style*="--lyrics-color-background"]{--lyrics-color-background:${lyricBg}!important;--lyrics-color-active:${c.accent}!important;--lyrics-color-inactive:${blend(c.panel,c.subtext,.76)}!important;--lyrics-color-passed:${blend(c.panel,c.subtext,.48)}!important;background-color:${lyricBg}!important;background-image:${character==='gaara'&&wallpaper?`linear-gradient(90deg,${alpha(c.bg,.94)} 35%,${alpha(c.bg,.5)}),url(${JSON.stringify(wallpaper)})`:`radial-gradient(ellipse at 85% 10%,${alpha(c.accent,.13)},transparent 65%)`}!important;background-size:cover!important;background-position:right center!important}
      ${character==='gaara'&&wallpaper?`
      [data-izify-lyrics-frame]{position:relative!important;isolation:isolate}
      [data-izify-lyrics-viewport]{position:relative!important;z-index:1;background:transparent!important}
      [data-izify-lyrics-scene],[data-izify-lyrics-scene] > div:first-child{background:none!important}
      .izify-lyrics-scene{position:absolute;inset:0;z-index:0;pointer-events:none;border-radius:inherit;background-color:${c.bg};background-image:linear-gradient(90deg,${alpha(c.bg,.94)} 35%,${alpha(c.bg,.5)}),url(${JSON.stringify(wallpaper)});background-size:cover;background-position:right center;background-repeat:no-repeat}
      `:''}
      [data-izify-lyrics-track]{position:relative!important}
      [data-izify-lyrics-track] > [data-testid="lyrics-line"]{padding-inline-start:52px!important;transition:color .25s ease,text-shadow .25s ease!important}
      [data-izify-lyric-active]{color:${c.accent}!important;text-shadow:0 0 24px ${alpha(c.accent,.25)}!important}
      .izify-lyrics-marker{position:absolute;top:0;left:4px;object-fit:contain;pointer-events:none;user-select:none;z-index:2;filter:drop-shadow(0 2px 8px ${alpha(c.accent,.32)});transition:transform .38s cubic-bezier(.22,1,.36,1);will-change:transform}
      .izify-lyrics-marker[hidden]{display:none!important}.izify-lyrics-marker[data-moving="false"]{transition:none}
      @media(prefers-reduced-motion:reduce){.izify-lyrics-marker{transition:none!important}}
      `:''}
      ${M.buildGaaraCSS?.(state)||''}
      ${st.noAnim?'*,*::before,*::after{transition:none!important;animation:none!important}':''}`;
  };
  M.parseThemeINI = text => {
    const schemes=Object.create(null);
    const fields={text:['colors','text'],subtext:['colors','subtext'],main:['colors','panel'],sidebar:['areas','sidebar'],player:['areas','player'],card:['colors','card'],'main-elevated':['colors','card'],'card-elevated':['colors','hover'],highlight:['colors','hover'],'highlight-elevated':['colors','hover'],button:['colors','button'],'button-active':['colors','accent'],'tab-active':['colors','selection'],misc:['colors','border'],shadow:['colors','shadow'],'selected-row':['colors','selection']};
    let current='Base';
    for(const raw of String(text).split(/\r?\n/)){
      const line=raw.trim();if(!line||/^[;#]/.test(line))continue;
      const section=/^\[([^\]]+)\]$/.exec(line);if(section){current=section[1].trim().slice(0,80);continue;}
      const entry=/^([\w-]+)\s*=\s*([^;]+)/.exec(line);if(!entry||!fields[entry[1].toLowerCase()])continue;
      let value=entry[2].trim();
      if(/^#?[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)){value=value.replace(/^#/,'');if(value.length===3)value=[...value].map(c=>c+c).join('');value='#'+value.toLowerCase();}
      else if(/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value)){const channels=value.split(',').map(Number);if(channels.some(v=>v>255))continue;value='#'+channels.map(v=>v.toString(16).padStart(2,'0')).join('');}
      else continue;
      const scheme=schemes[current] ||= {colors:{},areas:{}};const [group,key]=fields[entry[1].toLowerCase()];scheme[group][key]=value;
    }
    if(!Object.keys(schemes).length)throw new Error('Nenhuma paleta com cores hex ou RGB encontrada no color.ini.');
    return schemes;
  };
  function pattern(kind,color) {
    const stars='<path d="m28 16 3 8 8 3-8 3-3 8-3-8-8-3 8-3Zm126 66 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>';
    const skull='<path d="M93 29 73 8l2 38c-5 9-6 15-6 23 0 20 16 33 38 33s38-13 38-33c0-8-1-14-6-23l2-38-20 21c-9-4-19-4-28 0Z" fill="none" stroke-width="2"/><path d="M107 48c-9 0-15 6-15 13 0 5 3 9 7 11v8h16v-8c4-2 7-6 7-11 0-7-6-13-15-13Z"/><circle cx="102" cy="61" r="3" fill="#201329"/><circle cx="112" cy="61" r="3" fill="#201329"/>';
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="130" viewBox="0 0 200 130" fill="${color}" stroke="${color}">${kind==='kuromi'?skull+stars:kind==='stars'?stars:'<circle cx="20" cy="20" r="2"/><circle cx="120" cy="85" r="2"/>'}</svg>`;
    return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
  }
  // Read native CSS and adapt color declarations, leaving dimensions, media queries and album art intact.
  // This also covers Spotify's hashed classes without shipping a version-specific class map.
  function replaceColor(value,property,selector) {
    if (/bright-accent-set|inverted-theme/.test(selector)) return value;
    return value.replace(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|rgba?\(\s*[\d.,%\s]+\)|\b(?:black|white)\b/gi,token=>{
      let channels,opacity=1;
      if(token[0]==='#'){let hex=token.slice(1);if(hex.length<5)hex=[...hex].map(c=>c+c).join('');channels=[0,2,4].map(index=>parseInt(hex.slice(index,index+2),16));if(hex.length===8)opacity=parseInt(hex.slice(6),16)/255;}
      else if (/^rgb/i.test(token)) { if(token.includes('%'))return token;const numbers=token.match(/[\d.]+/g)?.map(Number);if(!numbers||numbers.length<3)return token;channels=numbers.slice(0,3);opacity=numbers[3]??1; }
      else channels=token.toLowerCase()==='black'?[0,0,0]:[255,255,255];
      if(!opacity)return token;
      const [r,g,b]=channels,max=Math.max(...channels),min=Math.min(...channels),neutral=max-min<16;
      let key;
      if(property==='--fg-color')key='accent';
      else if(!neutral && g>100 && g>r*1.6 && g>b*1.2)key='accent';
      else if(neutral){
        if(property.includes('shadow'))key='shadow';
        else if(/border|outline/.test(property))key='border';
        else if(property==='color'||property==='fill'||property==='stroke'||/^--(?:text|essential|decorative)/.test(property))key=max>215||max<70?'text':'subtext';
        else if(max>215&&opacity<1)key='selection';
        else key=max<5?'bg':max<25?'panel':max<48?'card':'hover';
      }
      if(!key)return token;
      return opacity<1?`rgba(var(--izify-rgb-${key}),${opacity.toFixed(3)})`:`var(--izify-color-${key})`;
    });
  }
  const baseSelectors={...S};
  M.createThemeEngine = ({onSelectorsChanged}={}) => {
    Object.assign(S,baseSelectors);
    const palette=document.createElement('style');palette.id='izify-palette';document.head.append(palette);
    const background=document.createElement('div');background.id='izify-background';background.setAttribute('aria-hidden','true');
    background.style.cssText='position:fixed;inset:0;z-index:0;pointer-events:none;';document.body.prepend(background);
    const seen=new WeakMap(),dirtySheets=new WeakSet();let stopped=false,timer=null,currentSheets=[];
    const stats={adaptedRules:0,inaccessibleSheets:0,sheets:0,refreshes:0,scans:0};
    const discovered=Object.fromEntries(Object.keys(S).map(name=>[name,new Set()]));
    let selectorsChanged=false;
    const areaNames={'main-view':'main','left-sidebar':'sidebar','right-sidebar':'rightbar','now-playing-bar':'player','global-nav':'topbar'};
    function adaptRules(rules) {
      let output='';
      for(const rule of rules){
        if(rule.selectorText&&rule.style){
          const gridArea=rule.style.getPropertyValue('grid-area').split('/')[0].trim();
          const area=areaNames[gridArea]||(rule.style.getPropertyValue('grid-template-areas').includes('left-sidebar main-view')?'layout':null);
          if(area&&!discovered[area].has(rule.selectorText)){discovered[area].add(rule.selectorText);S[area]=[baseSelectors[area],...discovered[area]].join(',');selectorsChanged=true;}
          // Cinema uses black gap masks on both nested frames. Variable shorthands
          // expose empty outline longhands in CSSOM, so the color pass cannot see them.
          // Removing only these decorative masks leaves keyboard focus outlines intact.
          const cinemaMask=/cinema/.test(rule.style.cssText)&&/outline:\s*var\(--panel-gap(?:\s*,[^)]*)?\)/.test(rule.style.cssText);
          let declarations=cinemaMask?'outline:none!important;':'';
          for(const property of rule.style){
            if(!/^(?:color|background(?:-color|-image)?|border(?:-.+)?|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|--fg-color|--(?:background|text|essential|decorative)[\w-]*)$/.test(property))continue;
            const value=rule.style.getPropertyValue(property),replacement=replaceColor(value,property,rule.selectorText);
            if(value!==replacement)declarations+=`${property}:${replacement}!important;`;
          }
          if(declarations){output+=`${rule.selectorText}{${declarations}}\n`;stats.adaptedRules++;}
        }else if(rule.cssRules&&/^@(?!keyframes|-webkit-keyframes)/.test(rule.cssText)){const content=adaptRules(rule.cssRules);if(content)output+=`${rule.cssText.slice(0,rule.cssText.indexOf('{'))}{${content}}\n`;}
      }
      return output;
    }
    function refresh() {
      timer=null;if(stopped)return;
      stats.refreshes++;
      let changed=false;
      stats.adaptedRules=0;stats.inaccessibleSheets=0;stats.sheets=0;
      const chunks=[],nextSheets=[];
      for(const sheet of document.styleSheets){
        const owner=sheet.ownerNode;if(owner?.id?.startsWith('izify-')||owner?.dataset.izifyPlugin)continue;
        try{
          const rules=sheet.cssRules;stats.sheets++;nextSheets.push(sheet);
          let record=seen.get(sheet);
          if(!record||record.count!==rules.length||dirtySheets.has(sheet)){stats.scans++;const before=stats.adaptedRules;record={count:rules.length,css:adaptRules(rules),adapted:stats.adaptedRules-before};seen.set(sheet,record);dirtySheets.delete(sheet);changed=true;}
          else stats.adaptedRules+=record.adapted;
          chunks.push(record.css);
        }catch{stats.inaccessibleSheets++;}
      }
      if(changed||nextSheets.length!==currentSheets.length||nextSheets.some((sheet,index)=>sheet!==currentSheets[index])){const text=chunks.join('\n');if(palette.textContent!==text)palette.textContent=text;}
      currentSheets=nextSheets;
      if(selectorsChanged){selectorsChanged=false;onSelectorsChanged?.();}
    }
    const schedule=()=>{if(!timer&&!stopped)timer=setTimeout(refresh,100);};
    const nativeStyle=node=>node?.nodeType===1&&['STYLE','LINK'].includes(node.tagName)&&!node.id.startsWith('izify-')&&!node.dataset.izifyPlugin;
    const observer=new MutationObserver(records=>{
      for(const record of records){const owner=record.target.nodeType===3?record.target.parentElement:record.target;
        if(nativeStyle(owner)){if(owner.sheet)dirtySheets.add(owner.sheet);schedule();}
        else if([...record.addedNodes,...record.removedNodes].some(nativeStyle))schedule();
      }
    });
    observer.observe(document.head,{subtree:true,childList:true,characterData:true});
    const onLoad=event=>{if(nativeStyle(event.target))schedule();};
    document.addEventListener('load',onLoad,true);
    refresh();
    return {
      apply(state){
        const b=state.bg,builtin=M.isLightMode?.()?'':M.characterAsset(state.decor.wallpaper,'wallpaper'),imageURL=b.image||builtin,hasImage=!!imageURL;
        background.hidden=!hasImage&&!b.gradient&&b.pattern==='none';
        const image=hasImage?'url('+JSON.stringify(imageURL)+')':b.gradient?`linear-gradient(${b.gAngle}deg,${b.g1},${b.g2})`:'none';
        background.style.backgroundImage=image;background.style.backgroundSize=b.fit==='tile'?'auto':b.fit;background.style.backgroundPosition=b.position;background.style.backgroundRepeat=b.fit==='tile'?'repeat':'no-repeat';
        background.style.filter=`blur(${b.blur}px) brightness(${b.brightness}%) saturate(${b.saturate}%)`;background.style.transform=b.blur?'scale(1.06)':'none';
        background.replaceChildren();
        if(b.pattern!=='none'){const decor=document.createElement('div');decor.style.cssText=`position:absolute;inset:0;background-image:${pattern(b.pattern,state.colors.accent)};opacity:${b.patternOpacity/100};`;background.append(decor);}
        const dim=document.createElement('div');dim.style.cssText=`position:absolute;inset:0;background:rgba(0,0,0,${b.dim/100});`;background.append(dim);
        document.documentElement.dataset.izifyTheme=state.preset;
        schedule();
      },
      status:()=>({...stats,surfaces:Object.fromEntries(['main','sidebar','rightbar','player','topbar'].map(key=>[key,document.querySelectorAll(S[key]).length]))}),
      destroy(){stopped=true;clearTimeout(timer);observer.disconnect();document.removeEventListener('load',onLoad,true);palette.remove();background.remove();delete document.documentElement.dataset.izifyTheme;},
    };
  };
})();
