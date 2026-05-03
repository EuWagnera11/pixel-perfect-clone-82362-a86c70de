// @ts-nocheck
/**
 * mockup-views.ts — view functions copiadas do mockup HTML original.
 *
 * Cada viewX() retorna uma string HTML idêntica à do mockup, que sera
 * renderizada via dangerouslySetInnerHTML pelo RefineApp.
 *
 * NÃO mexer manualmente — é uma cópia automática do mockup-html-v1.
 * Apenas adaptamos:
 *   - const A: "./refine-assets/" → "/refine-assets/" (path absoluto)
 *   - sem código de DOM (renderSidebar, renderHistory, setTab) — React orquestra.
 */
/* eslint-disable */
"use strict";
const A="/refine-assets/";

// ─── Pool de variações: cada categoria tem N imagens ───
const POOLS = {
  editorial:        {n:25, ext:'jpg'},
  persona:          {n:25, ext:'jpg'},
  'persona-tryptic':{n:5,  ext:'png'},
  map:              {n:15, ext:'jpg'},
  place:            {n:15, ext:'png'},
  character:        {n:10, ext:'png'},
  char3d:           {n:10, ext:'png'},
  fantasy:          {n:10, ext:'png'},
  wildlife:         {n:10, ext:'jpg'}
};

// Slots originais → pool category (slot fica visualmente igual, mas randomiza no load)
const SLOT_POOL = {
  // Sophia editorials (4:5)
  'editorial-1.jpg':'editorial','editorial-2.jpg':'editorial','editorial-3.jpg':'editorial','editorial-4.jpg':'editorial',
  // Sophia personas (4:5) — apenas slots femininos randomizam (pool é só Sophia f).
  // persona-redhead.jpg, persona-m1.jpg, persona-m2.jpg ficam fixos servindo arquivo literal
  // (m1/m2 são homens reais; redhead é a Sofia canônica).
  'persona-f1.jpg':'persona','persona-f2.jpg':'persona','persona-f3.jpg':'persona','persona-f5.jpg':'persona',
  // Persona tryptic
  'persona-portrait.png':'persona-tryptic',
  // Maps (NOT randomized - related quad: 1=source, 2=depth, 3=seg, 4=normal)
  // Edit pair (NOT randomized - true before/after)
  // Places
  'place-1.png':'place','place-2.png':'place','place-3.png':'place','place-4.png':'place',
  // Characters
  'char-ironman.png':'character',
  // 3D characters
  'char3d-1.png':'char3d','char3d-2.jpg':'char3d','char3d-3.jpg':'char3d','char3d-4.png':'char3d','char3d-5.png':'char3d','char3d-6.png':'char3d',
  // Fantasy
  'fantasy-1.png':'fantasy','fantasy-2.png':'fantasy','fantasy-3.png':'fantasy',
  // Wildlife (art slots)
  'art-1.jpg':'wildlife','art-2.jpg':'wildlife','art-3.jpg':'wildlife','art-4.jpg':'wildlife','art-5.jpg':'wildlife'
};

// Cache: cada slot decide UMA vez por page load (evita flicker em re-render)
const _imgCache = {};
const IMG = n => {
  if (n in _imgCache) return _imgCache[n];
  const cat = SLOT_POOL[n];
  if (cat && POOLS[cat]) {
    const idx = String(Math.floor(Math.random()*POOLS[cat].n)+1).padStart(2,'0');
    _imgCache[n] = `${A}${cat}-${idx}.${POOLS[cat].ext}`;
  } else {
    _imgCache[n] = A+n;
  }
  return _imgCache[n];
};
const ICO=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="${d}"/></svg>`;

function viewHome(){
  return `
  <div class="head">
    <div>
      <h1>Crie qualquer coisa com <em>refine.</em></h1>
    </div>
    <div class="head-actions">
      <div class="crumb" style="margin-right:6px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="opacity:.6"><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></svg><span>Workspace</span><span class="sep">/</span><b id="crumbName">Início</b></div>
      <button class="icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 11h8M8 7h2"/></svg></button>
      <button class="icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/></svg></button>
      <button class="tool-btn primary" data-tab="all">${ICO("M3 3h7v7H3z M14 3h7v7h-7z")}Todas as ferramentas</button>
    </div>
  </div>

  <div class="home-hero">
    <div class="hero-tile featured" data-tab="product">
      <img src="${A}brand-coca.jpg" alt="Product Gen" />
      <button class="open">${ICO("M5 12h14M13 5l7 7-7 7")}</button>
      <div class="body">
        <span class="tag lime">DESTAQUE · NOVA</span>
        <h3>Product Gen</h3>
        <p>Imagens publicitárias, mock-ups e cenas de produto com sua marca aplicada automaticamente. Lata, cosmético, eletrônico — tudo em qualidade editorial.</p>
      </div>
    </div>
    <div class="hero-tile" data-tab="image">
      <img src="${A}image-studio-tile.gif" alt="Image" />
      <button class="open">${ICO("M5 12h14M13 5l7 7-7 7")}</button>
      <div class="body"><span class="tag">NANO BANANA PRO · 4K</span><h3>Image Studio</h3><p>Geração avançada com texto perfeito.</p></div>
    </div>
    <div class="hero-tile" data-tab="video" data-hover-video="${A}video-hero.mp4">
      <img src="${A}place-1.png" alt="Video" />
      <button class="open">${ICO("M5 12h14M13 5l7 7-7 7")}</button>
      <div class="body"><span class="tag">KLING 3.0 · 4K</span><h3>Video Studio</h3><p>Vídeo cinema-grade em 4K.</p></div>
    </div>
    <div class="hero-tile wide" data-tab="depth" data-hover-video="${A}dragon-blink.mp4">
      <img src="${IMG('map-1.png')}" alt="Depth Map" />
      <button class="open">${ICO("M5 12h14M13 5l7 7-7 7")}</button>
      <div class="body"><span class="tag pink">BETA · CONTROLNET</span><h3>Depth Map Generator</h3><p>Mapas de profundidade e máscaras de segmentação pra ControlNet, IPAdapter e ComfyUI.</p></div>
    </div>
    <div class="hero-tile" data-tab="r3d" data-hover-video="${A}pixar-wave.mp4">
      <img src="${A}char3d-1.png" alt="Realistic 3D" style="object-fit:cover;object-position:center" />
      <button class="open">${ICO("M5 12h14M13 5l7 7-7 7")}</button>
      <div class="body"><span class="tag" style="background:var(--purple);color:#0a0a0b;border-color:transparent">REALISTIC 3D</span><h3>Realistic 3D</h3><p>Personagens 3D realistas estilo Pixar.</p></div>
    </div>
    <div class="hero-tile" data-tab="character">
      <img src="${A}character-tile.png" alt="Character" />
      <button class="open">${ICO("M5 12h14M13 5l7 7-7 7")}</button>
      <div class="body"><span class="tag">PERSONA · TRAINER</span><h3>Character Studio</h3><p>Personas consistentes com 8 fotos.</p></div>
    </div>
    <div class="hero-tile" data-tab="assets" data-hover-video="${A}treasure-open.mp4">
      <img src="${IMG('asset-game1.jpg')}" alt="Assets Gen" />
      <button class="open">${ICO("M5 12h14M13 5l7 7-7 7")}</button>
      <div class="body"><span class="tag cyan">3D · PROPS</span><h3>Assets Gen</h3><p>Crie props, ícones e elementos 3D.</p></div>
    </div>
    <div class="hero-tile" data-tab="audio">
      <img src="${IMG('art-2.jpg')}" alt="Audio" />
      <button class="open">${ICO("M5 12h14M13 5l7 7-7 7")}</button>
      <div class="body"><span class="tag lime">SUNO V4</span><h3>Audio Studio</h3><p>Trilhas, vozes e SFX originais.</p></div>
    </div>
  </div>

  <div class="sec-title">Atalhos rápidos<span class="line"></span></div>
  <div class="quick-tools">
    <div class="quick accent" data-tab="image"><div class="qico">${ICO("M3 3h18v18H3z")}</div><strong>Texto → Imagem</strong><span>Geração 1K</span></div>
    <div class="quick lime" data-tab="audio"><div class="qico">${ICO("M12 3v18M8 6v12")}</div><strong>Texto → Música</strong><span>30s · Suno v4</span></div>
    <div class="quick cyan" data-tab="video"><div class="qico">${ICO("M5 5h14v14H5z")}</div><strong>Imagem → Vídeo</strong><span>5s · 4K</span></div>
    <div class="quick" data-tab="upscale"><div class="qico">${ICO("M12 19V5M5 12l7-7 7 7")}</div><strong>Upscale 4K</strong><span>Skin natural</span></div>
    <div class="quick purple" data-tab="r3d"><div class="qico">${ICO("M21 12a9 9 0 1 1-18 0")}</div><strong>Realistic 3D</strong><span>Pixar style</span></div>
    <div class="quick" data-tab="removeobj"><div class="qico">${ICO("M3 6h18l-2 13H5z")}</div><strong>Remove Object</strong><span>Auto mask</span></div>
    <div class="quick" data-tab="replacebg"><div class="qico">${ICO("M3 3h18v18H3z")}</div><strong>Replace BG</strong><span>1-clique</span></div>
    <div class="quick" data-tab="skin"><div class="qico">${ICO("M12 2 14 9h7")}</div><strong>Skin Enhance</strong><span>Retouch pro</span></div>
  </div>`;
}

function viewImage(){
  return `
  <div class="head">
    <div><div class="eyebrow"><span class="dot"></span>AI Image · Nano-Banana Pro</div><h1>Crie imagens <em>cinematográficas</em></h1><p>Descreva a cena. O Refine devolve as variações em segundos.</p></div>
    <div class="head-actions">
      <button class="tool-btn" data-action="toggle-filters">${ICO("M3 7h18M6 12h12")}<span id="imgFiltersLabel">Filtros</span></button>
      <button class="tool-btn primary" data-action="export-image">${ICO("M21 15v4M7 10l5 5 5-5")}Exportar</button>
    </div>
  </div>
  <div class="stage" id="imgStageWrap"><div class="stage-inner">
    <img id="stageImg" src="${IMG('persona-portrait.png')}" alt="Geração atual" />
    <div class="stage-meta"><span id="imgMetaModel">Nano-Banana Pro</span><span class="seed">·</span><span class="seed" id="imgMetaQuality">2K</span><span class="seed">·</span><span class="seed" id="imgMetaRatio">3:4</span></div>
    <div class="stage-overlay">
      <button class="icon-btn" data-action="copy-image" title="Copiar imagem">${ICO("M9 9h10v10H9z M5 5h10v10H5z")}</button>
      <button class="icon-btn" data-action="export-image" title="Baixar">${ICO("M21 15v4M7 10l5 5 5-5M12 15V3")}</button>
      <button class="icon-btn" data-action="open-fullscreen" title="Tela cheia">${ICO("M5 5h6V3H3v8h2zM19 5v6h2V3h-8v2zM5 19v-6H3v8h8v-2zM19 19h-6v2h8v-8h-2z")}</button>
    </div>
    <div class="stage-controls">
      ${[['editorial-2.jpg','1'],['editorial-3.jpg','2'],['editorial-4.jpg','3'],['persona-f2.jpg','4']].map((p,i)=>`<button class="var-pill ${i===0?'active':''}" data-img="${IMG(p[0])}">${p[1]}</button>`).join('')}
    </div>
    <div class="stage-watermark">REFINE <span class="lime-tag">AI</span></div>
  </div></div>
  <div id="imgFiltersBar" style="display:none;gap:8px;flex-wrap:wrap;margin:12px 0 4px">
    ${['Original','B&P','Sépia','Vintage','Vivid','Cool','Warm','Noir'].map(f=>`<button class="tool-btn" data-filter="${f.toLowerCase()}">${f}</button>`).join('')}
  </div>
  <div class="sec-title">Variações<span class="line"></span></div>
  <div class="variations">
    ${[['editorial-2.jpg','v01'],['editorial-3.jpg','v02'],['editorial-4.jpg','v03'],['persona-f2.jpg','v04']].map((p,i)=>`<article class="variation" style="animation-delay:${i*70}ms" data-img="${IMG(p[0])}"><img src="${IMG(p[0])}" alt="${p[1]}" /><span class="index">${p[1]}</span></article>`).join('')}
  </div>
  <div class="sec-title">Style packs<span class="line"></span></div>
  <div class="styles">
    ${[['Editorial','editorial-1.jpg'],['Cyberpunk','bg-1.jpg'],['Fantasy','fantasy-2.png'],['Cinematic','place-2.png'],['Portrait','persona-f3.jpg'],['Surreal','fantasy-3.png']].map(([n,s])=>`<div class="style" data-style-pack="${n}" title="Aplicar pack ${n}"><img src="${IMG(s)}" alt="${n}" /><span class="name">${n}</span></div>`).join('')}
  </div>`;
}

function viewVideo(){
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span>AI Video · Kling 3.0 Omni</div><h1>Cenas <em>em movimento</em></h1><p>Vídeos cinematográficos a partir de prompt ou imagem.</p></div><div class="head-actions"><button class="tool-btn">${ICO("M3 7h18")}Smart Shot</button><button class="tool-btn primary">${ICO("M21 15v4M7 10l5 5 5-5")}Exportar MP4</button></div></div>
  <div class="video-stage"><video id="videoStageEl" autoplay muted loop playsinline poster="${IMG('place-1.png')}" style="width:100%;height:100%;object-fit:cover"><source src="${A}video-stage.mp4" type="video/mp4"></video><div class="video-overlay"></div><div class="video-meta"><span class="chip">Kling 3.0 Omni</span><span class="chip">9:16 · 5s · 24fps</span><span class="chip">seed 47829</span></div><button class="video-play" id="videoStagePlayBtn"><svg id="videoStagePlayIcon" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg></button><div class="timeline"><div class="tl-bar"><i id="videoStageProgress"></i></div><div class="tl-info"><span id="videoStageCurrent">00:00.00</span><span id="videoStageDur">00:05.00</span></div></div></div>
  <div class="sec-title">Storyboard<span class="line"></span></div>
  <div class="storyboard">${['place-2.png','place-3.png','place-4.png','fantasy-1.png','fantasy-2.png','fantasy-3.png','place-1.png','bg-1.jpg'].map((s,i)=>`<div class="frame ${i===2?'active':''}"><img src="${IMG(s)}" alt="" /><span class="num">${(i+1).toString().padStart(2,'0')}</span></div>`).join('')}</div>
  <div class="sec-title">Movimento de câmera<span class="line"></span></div>
  <div class="cam-controls">${[['Static','M5 12h14','active'],['Pan','M3 12h18M14 6l6 6-6 6',''],['Tilt','M12 3v18M6 14l6 6 6-6',''],['Zoom','M11 11l-3-3m3 3 3-3m-3 3-3 3m3-3 3 3','active'],['Dolly','M4 17h16M4 7h16',''],['Orbit','M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0','']].map(([n,p,a])=>`<div class="cam ${a}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${p}"/></svg><span>${n}</span></div>`).join('')}</div>`;
}

function viewAudio(){
  const bars=[];for(let i=0;i<80;i++){const h=20+Math.abs(Math.sin(i*.6))*70+Math.random()*15;const cls=i<30?'played':(i>50?'future':'');bars.push(`<div class="wf-bar ${cls}" style="height:${h}%;animation-delay:${i*40}ms"></div>`)}
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span>AI Audio · Suno Studio v4</div><h1>Trilhas <em>que emocionam</em></h1><p>Componha música, vozes e SFX originais.</p></div><div class="head-actions"><button class="tool-btn">${ICO("M9 18V5l12-2v13")}Letra</button><button class="tool-btn primary">${ICO("M21 15v4")}Exportar WAV</button></div></div>
  <audio id="suno-audio" preload="metadata" src="${A}midnight-lofi.mp3"></audio>
  <div class="audio-player"><div class="audio-cover"><img id="audioCover" src="${IMG('art-2.jpg')}" alt="capa" /></div><div class="audio-info"><div class="label">Em reprodução</div><h2 id="audioTitle">Midnight Lo-Fi · Refine Suite</h2><div class="meta" id="audioMeta">90 BPM · A minor · 0:42 / 1:48 · Suno v4</div></div><div class="audio-controls"><button class="ctrl"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 20 9 12l10-8zM5 4h2v16H5z"/></svg></button><button class="ctrl play" id="audioPlayBtn"><svg id="audioPlayIcon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button><button class="ctrl"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m5 4 10 8-10 8zM17 4h2v16h-2z"/></svg></button></div></div>
  <div class="waveform" id="audioWaveform">${bars.join('')}<div class="wf-cursor" id="audioCursor"></div></div>
  <div class="sec-title">Suas trilhas<span class="line"></span></div>
  <div class="tracks" id="trackList">${[['Midnight Lo-Fi','Refine Suite','90 BPM · A minor','1:48','art-2.jpg','midnight-lofi.mp3','active'],['Sunset Drive','Refine Suite','105 BPM · D maj','2:14','art-1.jpg','sunset-drive.mp3',''],['Neon Pulse','Refine Suite','128 BPM · F min','3:22','art-3.jpg','neon-pulse.mp3',''],['Soft Piano','Refine Suite','72 BPM · C maj','1:36','art-4.jpg','soft-piano.mp3','']].map(([n,art,m,t,s,mp3,a])=>`<div class="track ${a}" data-src="${A}${mp3}" data-name="${n}" data-artist="${art}" data-meta="${m}" data-dur="${t}" data-cover="${IMG(s)}"><div class="track-cover"><img src="${IMG(s)}" alt="" /></div><div class="track-name"><strong>${n}</strong><span>${m.split(' · ')[0]}</span></div><div class="track-mini-wave">${Array.from({length:24},(_,i)=>`<i style="height:${20+Math.abs(Math.sin(i+s.length))*70}%"></i>`).join('')}</div><div class="track-time">${t}</div><button class="icon-btn" style="border:0;width:28px;height:28px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="1.4"/></svg></button></div>`).join('')}</div>`;
}

function viewEdit(){
  const ACTIVE = activeEditTool || "Style Transfer";
  const tools = [
    ["Style Transfer","M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3a9 9 0 0 0 0 18"],
    ["Replace Background","M3 3h18v18H3z M3 15h6l3-3 3 3 6-6"],
    ["Remove Background","M3 3h18v18H3z M9 9l6 6m0-6-6 6"],
    ["Expand","M4 4h6v6M14 14h6v6M14 4l6 6M4 14l6 6"],
    ["Colorize","M13 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M6 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M18 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6"],
    ["Face Swap","M9 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M21 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0"],
    ["Cloth Swap","M6 3 4 7l3 2v12h10V9l3-2-2-4-4 2-3-1-3 1z"]
  ];
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span><span id="editEyebrowText">AI Edit · ${ACTIVE}</span></div><h1>Edições <em>sob medida</em></h1><p>Selecione uma ferramenta no painel à direita pra aplicar na imagem.</p></div><div class="head-actions"><button class="tool-btn">${ICO("M9 14l-4-4 4-4")}Desfazer</button><button class="tool-btn primary">${ICO("M21 15v4")}Salvar</button></div></div>
  <div class="edit-stage">
    <div class="before-after" style="height:560px"><img class="before" src="${IMG('edit-before.png')}" alt="antes" /><img class="after" src="${IMG('edit-after.png')}" alt="depois" /><div class="ba-divider"></div><div class="ba-handle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6-6 6 6 6M15 6l6 6-6 6"/></svg></div><span class="ba-label before">Antes</span><span class="ba-label after">Depois</span></div>
    <aside class="tools-panel">
      <h3>Ferramentas<span class="line"></span></h3>
      ${tools.map(([n,p])=>`<div class="tool-card ${n===ACTIVE?'active':''}" data-tool="${n}"><div class="ico">${ICO(p)}</div><div class="meta"><strong>${n}</strong></div></div>`).join('')}
    </aside>
  </div>`;
}

function viewCharacter(){
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span>AI Character · Persona</div><h1>Personas <em>consistentes</em></h1><p>Treine uma persona uma vez, use em qualquer cena.</p></div><div class="head-actions"><button class="tool-btn primary">${ICO("M12 5v14M5 12h14")}Treinar nova</button></div></div>
  <div class="char-hero"><div class="char-portrait"><img src="${A}sofia-hero.png" alt="Persona" /></div><div class="char-info"><div class="label">Persona em destaque</div><h2>Sofia · Editorial</h2><p>28 anos, fundo branco profissional, expressão confiante. Treinada em 12 fotos. Pronta pra qualquer cena.</p><div class="char-stats"><div class="char-stat"><strong>12</strong><span>Fotos treino</span></div><div class="char-stat"><strong>847</strong><span>Gerações</span></div><div class="char-stat"><strong>96.4%</strong><span>Consistência</span></div></div><div class="char-cta"><button class="tool-btn primary">${ICO("M12 5v14M5 12h14")}Usar em cena</button><button class="tool-btn">${ICO("M3 7h18")}Editar</button></div></div></div>
  <div class="sec-title">Suas personas<span class="line"></span></div>
  <div class="persona-grid">
    ${[['Sofia','12 fotos · 847','persona-redhead.jpg'],['Diego','8 fotos · 312','persona-m1.jpg'],['Ana','15 fotos · 1.2k','persona-f3.jpg'],['Lucas','10 fotos · 502','persona-m2.jpg'],['Júlia','9 fotos · 280','persona-f1.jpg']].map(([n,m,s])=>`<div class="persona"><img src="${IMG(s)}" alt="${n}" /><div class="info"><strong>${n}</strong><span>${m}</span></div></div>`).join('')}
    <div class="persona persona-train"><div class="ico">${ICO("M12 5v14M5 12h14")}</div><strong>Nova persona</strong><span>8+ fotos para treinar</span></div>
  </div>`;
}

function viewProduct(){
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span>AI Product · Generation Suite</div><h1>Imagens <em>publicitárias</em></h1><p>Pack-shots editoriais, mock-ups e cenas de produto com sua marca aplicada automaticamente.</p></div><div class="head-actions"><button class="tool-btn">${ICO("M3 12 12 3l9 9")}Brand kit</button><button class="tool-btn primary">${ICO("M12 5v14M5 12h14")}Novo produto</button></div></div>
  <div class="product-hero"><div class="img-side"><img src="${A}brand-tesla-hero.jpg" alt="Hero produto" /></div><div class="info-side"><div class="label">EM DESTAQUE · TESLA MODEL S × FUTURE SHOWROOM</div><h2>Crie produtos <em>icônicos</em></h2><p>Suba sua arte ou descreva. O motor adapta cores, tipografia e cenário pra entregar pack-shots prontos pro mercado em segundos.</p><div class="actions"><button class="tool-btn primary">${ICO("M12 5v14M5 12h14")}Criar produto</button><button class="tool-btn">${ICO("M3 3h7v7H3z")}Templates</button></div></div></div>
  <div class="sec-title">Pack-shots recentes<span class="line"></span></div>
  <div class="product-grid">
    ${[['Coca-Cola · Lata','cinematic','brand-coca.jpg'],['Monster Energy','neon dark','brand-monster.jpg'],['iPhone 16 Pro Max','spotlight','brand-iphone.jpg'],['Nike Air Max','sports editorial','brand-nike.jpg'],['Chanel No.5','marble luxe','brand-chanel.jpg'],['Heineken','pub warm','brand-heineken.jpg'],['MAC Cosmetics','beauty gloss','brand-mac.jpg'],["Lay's Classic",'snack hero','brand-lays.jpg']].map(([n,t,s])=>`<div class="prod"><img src="${A}${s}" alt="${n}" /><div class="info"><strong>${n}</strong><span>${t}</span></div></div>`).join('')}
  </div>`;
}

function viewR3D(){
  return `
  <div class="head"><div><div class="eyebrow" style="color:var(--purple)"><span class="dot" style="background:var(--purple);box-shadow:0 0 10px var(--purple)"></span>AI Realistic 3D · Pixar Engine</div><h1>Personagens <em>3D realistas</em></h1><p>Crie personagens, criaturas e props 3D com qualidade Pixar/Disney. Estilo cartoon realista, render volumétrico, fur e pele detalhados.</p></div><div class="head-actions"><button class="tool-btn">${ICO("M3 12 12 3l9 9")}Estilos</button><button class="tool-btn primary">${ICO("M12 5v14M5 12h14")}Novo personagem</button></div></div>
  <div class="r3d-hero">
    <div class="img-side"><img src="${A}r3d-hero.png" alt="Realistic 3D" /></div>
    <div class="info-side"><div class="label">EM DESTAQUE · POKÉMON 3D</div><h2>Crie criaturas <em>com vida</em></h2><p>Treinado em milhares de renders 3D photorealistas. Subsurface scattering, fur dinâmico, materiais PBR. Output direto pra Blender, Cinema 4D ou render final.</p><div class="actions"><button class="tool-btn primary">${ICO("M12 5v14M5 12h14")}Criar 3D</button><button class="tool-btn">${ICO("M3 3h7v7H3z")}Galeria</button></div></div>
  </div>
  <div class="sec-title">Presets de estilo<span class="line"></span></div>
  <div class="r3d-presets">
    ${[['Pixar','M12 3a9 9 0 1 0 0 18'],['Disney','M5 5h14v14H5z'],['Cartoon','M9 9h.01M15 9h.01'],['Realistic','M12 3v18'],['Stylized','M3 12h18'],['Toy','M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z']].map(([n,p])=>`<div class="r3d-preset"><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="${p}"/></svg></div><strong>${n}</strong><span>Premium</span></div>`).join('')}
  </div>
  <div class="sec-title">Sua coleção 3D<span class="line"></span></div>
  <div class="r3d-grid">
    ${[['Companion Pet','3D · Mascot','char3d-1.png'],['Forest Creature','3D · Fantasy','char3d-2.jpg'],['Magic Beast','3D · Cute','char3d-3.jpg'],['Cute Mascot','3D · Pixar','char3d-4.png'],['Fluffy Friend','3D · Mascot','char3d-5.png'],['Story Companion','3D · Fantasy','char3d-6.png'],['Espada Encantada','PROP · Arma','asset-game4.png'],['Ampulheta Mística','PROP · Relíquia','asset-game5.png']].map(([n,t,s])=>`<div class="r3d-card"><img src="${IMG(s)}" alt="${n}" /><div class="info"><strong>${n}</strong><span>${t}</span></div></div>`).join('')}
  </div>`;
}

function viewDepth(){
  return `
  <div class="head"><div><div class="eyebrow" style="color:var(--emerald)"><span class="dot" style="background:var(--emerald);box-shadow:0 0 10px var(--emerald)"></span>AI Depth · ControlNet Suite</div><h1>Mapas de <em>profundidade</em></h1><p>Gere depth maps, normal maps e máscaras de segmentação. Pronto pra ControlNet, IPAdapter e ComfyUI.</p></div><div class="head-actions"><button class="tool-btn">${ICO("M3 7h18")}Logs</button><button class="tool-btn primary">${ICO("M21 15v4M7 10l5 5 5-5")}Exportar</button></div></div>
  <div class="node-stat-bar">
    <div class="stat"><span>WORKFLOW</span><strong>Depth + Mask · v2.6</strong></div>
    <div class="stat"><span>RUNTIME</span><strong>5.488s</strong></div>
    <div class="stat"><span>VRAM</span><strong>14.2 / 24 GB</strong></div>
    <div class="stat"><span>STATUS</span><strong style="color:var(--lime)">● COMPLETED</strong></div>
  </div>
  <div class="node-title-banner">Map Generator</div>
  <div class="node-canvas">
    <div class="node">
      <div class="node-head"><span>0.552s</span><span class="badge">#47</span></div>
      <div class="node-conn"><span><span class="dot"></span>Load Image</span><span style="color:var(--emerald)">IMAGE ●</span></div>
      <div class="node-body"><img src="${IMG('map-1.png')}" alt="" /></div>
      <div class="node-foot">3658 × 2044 · original</div>
    </div>
    <div class="node">
      <div class="node-head"><span>2.423s</span><span class="badge">#156</span></div>
      <div class="node-conn"><span><span class="dot"></span>Preview · Noise</span><span style="color:var(--emerald)">image_urls ●</span></div>
      <div class="node-body"><img src="${IMG('map-2.jpg')}" alt="" /></div>
      <div class="node-foot">1370 × 765 · sample</div>
    </div>
    <div class="node">
      <div class="node-head"><span>2.182s</span><span class="badge">#154</span></div>
      <div class="node-conn"><span><span class="dot"></span>Preview · Mask</span><span style="color:var(--emerald)">image_urls ●</span></div>
      <div class="node-body"><img src="${IMG('map-3.jpg')}" alt="" /></div>
      <div class="node-foot">1834 × 1024 · segmentation</div>
    </div>
    <div class="node">
      <div class="node-head"><span>0.302s</span><span class="badge">#174</span></div>
      <div class="node-conn"><span><span class="dot"></span>Preview · Depth</span><span style="color:var(--emerald)">image_urls ●</span></div>
      <div class="node-body"><img src="${IMG('map-4.jpg')}" alt="" /></div>
      <div class="node-foot">3658 × 2044 · depth map</div>
    </div>
  </div>
  <div class="sec-title">Modos disponíveis<span class="line"></span></div>
  <div class="quick-tools" style="grid-template-columns:repeat(6,1fr)">
    ${[
      ['Depth (MiDaS)','Profundidade clássica','M3 12h18','emerald'],
      ['Depth (Marigold)','Maior precisão','M5 5h14v14H5z','emerald'],
      ['Normal Map','Direção de superfície','M12 3a9 9 0 1 0 0 18','cyan'],
      ['Segmentation','Máscara semântica','M3 6h18l-2 13H5z','purple'],
      ['Canny Edge','Bordas','M12 19V5','accent'],
      ['OpenPose','Pose humana','M5 12l7-7','pink']
    ].map(([n,d,p,c])=>{const colorMap={emerald:'#34d399',cyan:'#06b6d4',purple:'#c084fc',accent:'#ff6a1a',pink:'#ec4899'};const col=colorMap[c]||'#34d399';return `<div class="quick ${c==='emerald'?'lime':c}"><div class="qico" style="background:${col}22;color:${col}">${ICO(p)}</div><strong>${n}</strong><span>${d}</span></div>`}).join('')}
  </div>`;
}

function viewAssets(){
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span>AI Assets · Game & Props</div><h1>Crie <em>assets</em> sob demanda</h1><p>Props, ícones, elementos de jogo, materiais. Tudo com transparência embutida e qualidade pra produção.</p></div><div class="head-actions"><button class="tool-btn">${ICO("M3 7h18")}Categorias</button><button class="tool-btn primary">${ICO("M12 5v14M5 12h14")}Novo asset</button></div></div>
  <div class="all-cats" style="margin-bottom:18px">
    <button class="cat active">Todos<span class="count">42</span></button>
    <button class="cat">Game Props<span class="count">14</span></button>
    <button class="cat">Ícones<span class="count">8</span></button>
    <button class="cat">Materiais<span class="count">6</span></button>
    <button class="cat">Naturais<span class="count">7</span></button>
    <button class="cat">Mágicos<span class="count">7</span></button>
  </div>
  <div class="assets-grid">
    ${[
      ['asset-game1.jpg','Baú de tesouro','GAME · CHEST'],
      ['asset-game2.jpg','Cristal ametista','GAME · GEM'],
      ['asset-game3.jpg','Grimório rúnico','GAME · TOME'],
      ['asset-game4.png','Espada lendária','GAME · WEAPON'],
      ['asset-game5.png','Elixir esmeralda','GAME · POTION'],
      ['asset-game6.png','Tábua rúnica','GAME · RUNE'],
      ['asset-1.png','Bússola steampunk','3D · STEAMPUNK'],
      ['asset-2.png','Elmo do dragão','3D · ARMOR'],
      ['asset-3.png','Baú celta','3D · CHEST'],
      ['asset-4.png','Card holográfico','MATERIAL · HOLO']
    ].map(([s,n,t])=>`<div class="asset-card"><span class="type">${t}</span><img src="${IMG(s)}" alt="${n}" /><div class="info"><strong>${n}</strong><span>3658 × 2044 · 24bit</span></div></div>`).join('')}
  </div>
  <div class="sec-title">Inspirações da comunidade<span class="line"></span></div>
  <div class="assets-grid">
    ${[['fantasy-2.png','Capitão pirata','FANTASY · CHAR'],['fantasy-3.png','Mago elemental','FANTASY · MAGIC'],['biblical-1.png','Visão divina','EPIC · SCENE'],['biblical-2.png','Santuário sagrado','EPIC · TEMPLE'],['art-4.jpg','Águia em voo','WILDLIFE · EAGLE']].map(([s,n,t])=>`<div class="asset-card"><span class="type">${t}</span><img src="${IMG(s)}" alt="${n}" /><div class="info"><strong>${n}</strong><span>1920 × 1080</span></div></div>`).join('')}
  </div>`;
}

function viewMarketing(){
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span>AI Marketing · Studio</div><h1>Conteúdo <em>que converte</em></h1><p>Posts, anúncios, banners e thumbnails com a sua marca aplicada automaticamente.</p></div><div class="head-actions"><button class="tool-btn">${ICO("M3 12 12 3l9 9")}Brand kit</button><button class="tool-btn primary">${ICO("M21 15v4")}Exportar</button></div></div>
  <div class="sec-title">Formatos<span class="line"></span></div>
  <div class="formats">
    <div class="format story"><div class="preview"><img src="${IMG('persona-f2.jpg')}" alt="story" /></div><strong>Stories</strong><p>Instagram, TikTok, Reels</p><span class="size">1080 × 1920 · 9:16</span></div>
    <div class="format post"><div class="preview"><img src="${IMG('product-2.png')}" alt="post" /></div><strong>Feed Post</strong><p>Instagram, Facebook, X</p><span class="size">1080 × 1080 · 1:1</span></div>
    <div class="format ad"><div class="preview"><img src="${IMG('editorial-2.jpg')}" alt="ad" /></div><strong>Ads Verticais</strong><p>Meta, TikTok Ads</p><span class="size">1080 × 1350 · 4:5</span></div>
    <div class="format banner"><div class="preview"><img src="${IMG('place-2.png')}" alt="banner" /></div><strong>Banners</strong><p>Google Display, YouTube</p><span class="size">1920 × 1080 · 16:9</span></div>
  </div>
  <div class="sec-title">Campanhas recentes<span class="line"></span></div>
  <div class="campaigns">
    ${[['Black Friday','12 peças · ontem','LIVE','editorial-1.jpg'],['Lançamento SS26','8 peças · 23 abr','RASCUNHO','editorial-3.jpg'],['Influencer Drop','6 peças · 21 abr','LIVE','persona-f5.jpg'],['Brand Awareness','15 peças · 18 abr','PAUSADO','place-3.png']].map(([n,m,b,s])=>{const bClass=b==='LIVE'?'live':b==='RASCUNHO'?'draft':'paused';return `<div class="campaign"><img src="${IMG(s)}" alt="${n}" /><span class="badge badge-${bClass}">${b}</span><div class="meta"><strong>${n}</strong><span>${m}</span></div></div>`}).join('')}
  </div>`;
}

function viewAll(){
  const tools = [
    {n:"Image",d:"Texto → imagem em 4K",c:"criar",key:"image",isnew:false},
    {n:"Video",d:"Texto/imagem → vídeo",c:"criar",key:"video"},
    {n:"Audio",d:"Trilhas, vozes, SFX",c:"criar",key:"audio",isnew:true},
    {n:"Product Gen",d:"Pack-shots editoriais",c:"criar",key:"product",isnew:true},
    {n:"Realistic 3D",d:"Personagens 3D Pixar",c:"criar",key:"r3d",isnew:true},
    {n:"Assets Gen",d:"Props, ícones, materiais",c:"criar",key:"assets",isnew:true},
    {n:"Character",d:"Personas consistentes",c:"criar",key:"character"},
    {n:"Edit Image",d:"Inpaint, outpaint, máscara",c:"editar",key:"edit"},
    {n:"Outpaint",d:"Expandir canvas",c:"editar",key:"outpaint"},
    {n:"Remove Object",d:"Apagar elementos",c:"editar",key:"removeobj"},
    {n:"Sketch to Image",d:"Rabisco em foto",c:"editar",key:"sketch"},
    {n:"Style Transfer",d:"Aplicar referência",c:"editar",key:"styletransfer"},
    {n:"Replace Background",d:"Trocar cenário",c:"editar",key:"replacebg"},
    {n:"Expand",d:"Esticar canvas",c:"editar",key:"expand"},
    {n:"Colorize",d:"Colorir P&B",c:"editar",key:"colorize"},
    {n:"Scene Swap",d:"Trocar cenário",c:"transformar",key:"sceneswap"},
    {n:"Hair Change",d:"Mudar cabelo",c:"transformar",key:"hairchange"},
    {n:"Expression",d:"Mudar expressão",c:"transformar",key:"expression"},
    {n:"Age Change",d:"Envelhecer",c:"transformar",key:"agechange"},
    {n:"Twin",d:"Multiplicar persona",c:"transformar",key:"twin"},
    {n:"Face Swap",d:"Trocar rosto",c:"transformar",key:"faceswap"},
    {n:"Cloth Swap",d:"Trocar roupa",c:"transformar",key:"clothswap"},
    {n:"Skin Enhance",d:"Retouch profissional",c:"melhorar",key:"skin"},
    {n:"Background Remove",d:"Recortar fundo",c:"melhorar",key:"bgremove"},
    {n:"Relight",d:"Re-iluminar",c:"melhorar",key:"relight"},
    {n:"Photo Restoration",d:"Restaurar antiga",c:"melhorar",key:"restore"},
    {n:"Upscale",d:"Aumentar até 4K",c:"melhorar",key:"upscale"},
    {n:"Depth Map",d:"Mapas de profundidade",c:"melhorar",key:"depth",isnew:true},
    {n:"Headshot Pro",d:"LinkedIn-ready",c:"profissional",key:"headshot"},
    {n:"Real Estate",d:"Fotos de imóveis",c:"profissional",key:"realestate"},
    {n:"Food Photography",d:"Pratos editoriais",c:"profissional",key:"food"},
    {n:"Magazine Cover",d:"Capa de revista",c:"profissional",key:"magazine"},
    {n:"YouTube Thumbnail",d:"Thumbs que convertem",c:"profissional",key:"yt"},
    {n:"Passport Photo",d:"Foto 3x4 oficial",c:"profissional",key:"passport"},
    {n:"Maternity",d:"Ensaio gestante",c:"profissional",key:"maternity"},
    {n:"Wedding",d:"Ensaios de casamento",c:"profissional",key:"wedding"},
    {n:"Family Portrait",d:"Retrato família",c:"profissional",key:"family"},
    {n:"Multi-View",d:"9 ângulos",c:"profissional",key:"multiview"},
    {n:"Lip Sync",d:"Áudio + boca",c:"profissional",key:"lipsync"},
    {n:"E-commerce",d:"Pack-shots produto",c:"profissional",key:"ecommerce"},
    {n:"Bulk Import",d:"Importar lote",c:"workflow",key:"bulk"},
    {n:"Style Learning",d:"Treinar estilo",c:"workflow",key:"stylelearn"},
    {n:"Recreate",d:"Recriar a partir de ref",c:"workflow",key:"recreate"},
    {n:"Marketing Studio",d:"Campanhas completas",c:"workflow",key:"marketing"}
  ];
  const cats = [{k:"all",n:"Todas"},{k:"criar",n:"Criar"},{k:"editar",n:"Editar"},{k:"transformar",n:"Transformar"},{k:"melhorar",n:"Melhorar"},{k:"profissional",n:"Profissional"},{k:"workflow",n:"Workflow"}];
  const counts = {all:tools.length};cats.forEach(c=>{if(c.k!=="all") counts[c.k]=tools.filter(t=>t.c===c.k).length});
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span>SUITE COMPLETA</div><h1>Todas as <em>ferramentas</em></h1><p>${tools.length} ferramentas especializadas. Cada uma com interface dedicada.</p></div></div>
  <div class="all-search">${ICO("M11 11a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-3.5-3.5")}<input id="allSearch" placeholder="Buscar ferramenta..." /></div>
  <div class="all-cats" id="allCats">${cats.map(c=>`<button class="cat ${c.k==='all'?'active':''}" data-cat="${c.k}">${c.n}<span class="count">${counts[c.k]}</span></button>`).join('')}</div>
  <div class="tools-bento" id="bento">
    ${tools.map(t=>`<div class="bento-tool" data-cat="${t.c}" data-name="${t.n.toLowerCase()}" data-tab="${t.key}">
      <div class="top"><div class="ico ${t.c}">${ICO("M5 5h14v14H5z")}</div><span class="cat-pill ${t.c}">${t.c}${t.isnew?' · NEW':''}</span></div>
      <h4>${t.n}</h4><p>${t.d}</p>
      <span class="open-link">Abrir ${ICO("M5 12h14M13 5l7 7-7 7")}</span>
    </div>`).join('')}
  </div>`;
}

// Generic placeholder for any tool that doesn't have a dedicated view
// Catálogo global de ferramentas (alimenta viewAll + viewGeneric label fallback)
const ALL_TOOLS = [
  {n:"Image",d:"Texto → imagem em 4K",c:"criar",key:"image"},
  {n:"Video",d:"Texto/imagem → vídeo",c:"criar",key:"video"},
  {n:"Audio",d:"Trilhas, vozes, SFX",c:"criar",key:"audio",isnew:true},
  {n:"Product Gen",d:"Pack-shots editoriais",c:"criar",key:"product",isnew:true},
  {n:"Realistic 3D",d:"Personagens 3D Pixar",c:"criar",key:"r3d",isnew:true},
  {n:"Assets Gen",d:"Props, ícones, materiais",c:"criar",key:"assets",isnew:true},
  {n:"Character",d:"Personas consistentes",c:"criar",key:"character"},
  {n:"Edit Image",d:"Inpaint, outpaint, máscara",c:"editar",key:"edit"},
  {n:"Outpaint",d:"Expandir canvas",c:"editar",key:"outpaint"},
  {n:"Remove Object",d:"Apagar elementos",c:"editar",key:"removeobj"},
  {n:"Sketch to Image",d:"Rabisco em foto",c:"editar",key:"sketch"},
  {n:"Style Transfer",d:"Aplicar referência",c:"editar",key:"styletransfer"},
  {n:"Replace Background",d:"Trocar cenário",c:"editar",key:"replacebg"},
  {n:"Expand",d:"Esticar canvas",c:"editar",key:"expand"},
  {n:"Colorize",d:"Colorir P&B",c:"editar",key:"colorize"},
  {n:"Scene Swap",d:"Trocar cenário",c:"transformar",key:"sceneswap"},
  {n:"Hair Change",d:"Mudar cabelo",c:"transformar",key:"hairchange"},
  {n:"Expression",d:"Mudar expressão",c:"transformar",key:"expression"},
  {n:"Age Change",d:"Envelhecer",c:"transformar",key:"agechange"},
  {n:"Twin",d:"Multiplicar persona",c:"transformar",key:"twin"},
  {n:"Face Swap",d:"Trocar rosto",c:"transformar",key:"faceswap"},
  {n:"Cloth Swap",d:"Trocar roupa",c:"transformar",key:"clothswap"},
  {n:"Skin Enhance",d:"Retouch profissional",c:"melhorar",key:"skin"},
  {n:"Background Remove",d:"Recortar fundo",c:"melhorar",key:"bgremove"},
  {n:"Relight",d:"Re-iluminar",c:"melhorar",key:"relight"},
  {n:"Photo Restoration",d:"Restaurar antiga",c:"melhorar",key:"restore"},
  {n:"Upscale",d:"Aumentar até 4K",c:"melhorar",key:"upscale"},
  {n:"Depth Map",d:"Mapas de profundidade",c:"melhorar",key:"depth",isnew:true},
  {n:"Headshot Pro",d:"LinkedIn-ready",c:"profissional",key:"headshot"},
  {n:"Real Estate",d:"Fotos de imóveis",c:"profissional",key:"realestate"},
  {n:"Food Photography",d:"Pratos editoriais",c:"profissional",key:"food"},
  {n:"Magazine Cover",d:"Capa de revista",c:"profissional",key:"magazine"},
  {n:"YouTube Thumbnail",d:"Thumbs que convertem",c:"profissional",key:"yt"},
  {n:"Passport Photo",d:"Foto 3x4 oficial",c:"profissional",key:"passport"},
  {n:"Maternity",d:"Ensaio gestante",c:"profissional",key:"maternity"},
  {n:"Wedding",d:"Ensaios de casamento",c:"profissional",key:"wedding"},
  {n:"Family Portrait",d:"Retrato família",c:"profissional",key:"family"},
  {n:"Multi-View",d:"9 ângulos",c:"profissional",key:"multiview"},
  {n:"Lip Sync",d:"Áudio + boca",c:"profissional",key:"lipsync"},
  {n:"E-commerce",d:"Pack-shots produto",c:"profissional",key:"ecommerce"},
  {n:"Bulk Import",d:"Importar lote",c:"workflow",key:"bulk"},
  {n:"Style Learning",d:"Treinar estilo",c:"workflow",key:"stylelearn"},
  {n:"Recreate",d:"Recriar a partir de ref",c:"workflow",key:"recreate"},
  {n:"Marketing Studio",d:"Campanhas completas",c:"workflow",key:"marketing"}
];

function viewGeneric(toolKey){
  // 1. Tenta NAV (label/ícone primário); 2. ALL_TOOLS (fallback bento)
  let tool = null;
  for(const g of NAV){
    if(g.items){
      const f = g.items.find(it=>it.key===toolKey);
      if(f){ tool = {label:f.label, ico:f.ico}; break; }
    }
  }
  if(!tool){
    const t = ALL_TOOLS.find(t=>t.key===toolKey);
    if(t) tool = {label:t.n, ico:"M5 5h14v14H5z"};
  }
  if(!tool) tool = {label:toolKey.charAt(0).toUpperCase()+toolKey.slice(1), ico:"M5 5h14v14H5z"};
  return `
  <div class="head"><div><div class="eyebrow"><span class="dot"></span>FERRAMENTA</div><h1>${tool.label}</h1><p>Esta ferramenta está em construção. Volte em breve para experimentar a interface dedicada.</p></div><div class="head-actions"><button class="tool-btn primary" data-tab="all">${ICO("M3 3h7v7H3z M14 3h7v7h-7z")}Voltar pra todas</button></div></div>
  <div class="tool-page">
    <div class="panel">
      <div class="ico">${ICO(tool.ico)}</div>
      <h3>${tool.label}</h3>
      <p>Você selecionou uma ferramenta da nossa suíte completa. A interface dedicada será liberada no próximo release. Por enquanto você pode usar a ferramenta principal mais próxima ou testar nossas demos.</p>
      <div class="actions">
        <button class="tool-btn primary" data-tab="image">${ICO("M3 3h18v18H3z")}Image Studio</button>
        <button class="tool-btn" data-tab="edit">${ICO("M12 19V5")}Edit Studio</button>
        <button class="tool-btn" data-tab="all">${ICO("M3 3h7v7H3z M14 3h7v7h-7z")}Todas</button>
      </div>
    </div>
    <div class="sec-title">Outras ferramentas do mesmo grupo<span class="line"></span></div>
    <div class="quick-tools" style="grid-template-columns:repeat(6,1fr)">
      ${(NAV.find(g=>g.items&&g.items.some(it=>it.key===toolKey))?.items||[]).slice(0,6).map(it=>`<div class="quick" data-tab="${it.key}"><div class="qico">${ICO(it.ico)}</div><strong>${it.label}</strong><span>Abrir</span></div>`).join('')}
    </div>
  </div>`;
}
const VIEWS = {
  home:viewHome, image:viewImage, video:viewVideo, audio:viewAudio, edit:viewEdit,
  character:viewCharacter, marketing:viewMarketing, product:viewProduct,
  depth:viewDepth, assets:viewAssets, all:viewAll, r3d:viewR3D
};

const TAB_CONFIG = {
  home:{model:"Refine Suite",ratio:"—",placeholder:"Pergunte qualquer coisa ou descreva uma cena…",noDock:true,noRail:true},
  image:{model:"Nano-Banana Pro",ratio:"16:9",placeholder:"Persona feminina, fotografia editorial, luz natural quente, 35mm…"},
  video:{model:"Kling 3.0 Omni",ratio:"9:16",placeholder:"Travelling lateral · rua de Tóquio à noite, neon refletido na chuva…"},
  audio:{model:"Suno Studio v4",ratio:"3:1",placeholder:"Trilha lo-fi, 90 BPM, melancólica, piano + chuva ao fundo, 45s…"},
  edit:{model:"Refine Edit v2",ratio:"1:1",placeholder:"Remover poste e expandir o céu pra cima…"},
  character:{model:"Persona Trainer",ratio:"3:4",placeholder:"Persona Sofia: 28 anos, cabelos ruivos, olhar confiante…"},
  marketing:{model:"Brand Engine",ratio:"4:5",placeholder:"Post de lançamento, fundo escuro, headline ousada, CTA laranja…"},
  product:{model:"Product Engine",ratio:"1:1",placeholder:"Lata edição limitada, paisagem cartoon, hora dourada…"},
  r3d:{model:"Pixar Engine",ratio:"3:4",placeholder:"Personagem 3D estilo Pixar, fofo, olhos grandes, fur detalhado…"},
  depth:{model:"MiDaS · Marigold",ratio:"—",placeholder:"Suba imagem ou descreva. Geramos depth + normal + mask…"},
  assets:{model:"Asset Forge",ratio:"1:1",placeholder:"Cofre encantado, fundo transparente, render 3D, 4K…"},
  all:{model:"—",ratio:"—",placeholder:"Buscar ferramenta…",noDock:true,noRail:true}
};

// Edit-related tools that should open inside the Edit page (with that tool pre-selected)
const EDIT_TOOLS = {
  outpaint:"Outpaint", removeobj:"Remove Object", sketch:"Sketch to Image",
  styletransfer:"Style Transfer", replacebg:"Replace BG", expand:"Expand",
  colorize:"Colorize", faceswap:"Face Swap", clothswap:"Cloth Swap",
  hairchange:"Hair Change", expression:"Expression", agechange:"Age Change",
  twin:"Twin", skin:"Skin Enhance", bgremove:"Background Remove",
  relight:"Relight", restore:"Photo Restoration", upscale:"Upscale"
};
let activeEditTool = "Style Transfer";


// ─── Exports pra TS/React ───
export { VIEWS, TAB_CONFIG, IMG, ICO };
export type ViewKey = keyof typeof VIEWS;
