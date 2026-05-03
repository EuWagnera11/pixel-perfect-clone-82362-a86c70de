# Refine Studio — sub-páginas por ferramenta + fila de jobs paralela

## Diagnóstico do front atual

Hoje o `RefineApp` é uma única SPA controlada por `currentTab` (state). Tudo está em uma rota só (`/refine` ou similar), e ao clicar em **Gerar** o app entra em `isGenerating=true` e **bloqueia** até o polling terminar (até 5–10 min em vídeo). Não dá pra trocar de aba nem mandar outro job em paralelo.

O dispatcher `executeToolAction` já separa por tab, mas é um único `if/else` gigante — sem espaço pra parâmetros específicos de cada ferramenta (ex.: tipo de edit, engine de upscale, duração de vídeo, kind de áudio).

## O que vou fazer

### 1. Sub-páginas por ferramenta (rotas reais)

Cada item da sidebar vira uma rota `/app/refine/:tool`, compartilhando o layout (sidebar + rail + dock):

```text
/app/refine/home          → Hub
/app/refine/image         → Image (Nano-Banana / Imagen / Flux …)
/app/refine/cinema        → Cinema (preset cinematográfico, 21:9)
/app/refine/video         → Video (i2v: Kling, Veo, Hailuo, Runway…)
/app/refine/audio         → Audio (música / SFX)
/app/refine/edit          → Edit Image (remove-bg, replace-bg, relight, expand, style-transfer)
/app/refine/upscale       → Upscale (Magnific creative / precision)
/app/refine/ecommerce     → E-commerce (produto + cena)
/app/refine/product       → Product Gen
/app/refine/r3d           → Realistic 3D (Seedream)
/app/refine/character     → Character (persona)
/app/refine/depth         → Depth Map
/app/refine/assets        → Assets Gen (Nano-Banana Flash)
/app/refine/marketing     → Marketing
/app/refine/explore       → Explorar
/app/refine/projects      → Projetos
```

Refator: `RefineApp` vira `RefineLayout` (sidebar+rail+toast+jobs panel) com `<Outlet/>`. Sidebar usa `NavLink` do react-router e marca ativo pelo `useLocation` (segue padrão do shadcn-sidebar). Refresh / deep-link funcionam (Lovable já trata SPA fallback).

### 2. Uma função própria por ferramenta

`src/refine/lib/tool-actions.ts` é quebrado em handlers individuais (`src/refine/tools/<tool>.ts`), cada um com sua assinatura/options:

| Ferramenta | Handler | Opções específicas (UI no Dock/painel) |
|---|---|---|
| Image | `runImage` | model, refs[], num_variations, aspect |
| Cinema | `runCinema` | model (default nano-banana-pro), aspect 21:9, prompt prefix cinematográfico |
| Video | `runVideo` | model (kling/veo/…), image_url (obrigatório p/ i2v), duration, aspect |
| Audio | `runAudio` | kind: "music" \| "sfx", duration |
| Edit | `runEdit` | op: remove-bg / replace-bg / relight / expand / style-transfer, image_url, style_url |
| Upscale | `runUpscale` | engine: magnific-creative / magnific-precision |
| Product | `runProduct` | image_url do produto + scene prompt |
| E-commerce | `runEcommerce` | mesmo + variantes de fundo |
| Character | `runCharacter` | persona_id ou ref image |
| 3D | `run3D` | seedream-v4 |
| Depth | `runDepth` | image_url p/ extrair maps |
| Assets | `runAssets` | Nano-Banana Flash |
| Marketing | `runMarketing` | brief → 4 variações |

Cada handler retorna `{ generationId, taskId, mediaType }` (não bloqueia mais — só dispara). Polling fica na fila (item 3).

Cada sub-página define seu próprio painel de opções (acima do Dock ou no Rail direito) com os controles específicos da ferramenta.

### 3. Fila de jobs em background (gerar várias coisas em paralelo)

Nova store global `JobsProvider` em `src/refine/lib/jobs.tsx`:

```ts
type Job = {
  id: string;            // generation_id
  tool: string;          // "image" | "video" | …
  prompt: string;
  thumb?: string;        // ref enviada (pra preview enquanto roda)
  mediaType: "image" | "video" | "audio";
  status: "queued" | "processing" | "completed" | "failed";
  startedAt: number;
  resultUrl?: string;
  error?: string;
};
```

Comportamento:
- `enqueue(job)` → adiciona com status `processing` e dispara `pollGeneration` em background (Promise solta, sem await).
- Form limpa imediatamente, usuário pode trocar de aba ou disparar outro job (sem limite — cada job tem seu próprio polling).
- Quando completa, mostra toast + adiciona ao `history` (Rail) + grava em `localStorage` pra sobreviver a refresh.
- Polling reaproveita `task-status` existente (intervalo 4s, timeout 10min p/ vídeo, 5min p/ resto).

Visual:
- **Badge no header da sidebar**: "3 gerando…" com spinner.
- **Painel "Jobs em andamento"** (drawer ou seção no topo do Rail) listando cada job com thumb, prompt, progresso, e botão "Abrir" quando pronto.
- Job concluído some do painel após X segundos e cai no Rail/galeria normal.

### 4. Dock fica não-bloqueante

Botão **Gerar** chama `enqueue()` e retorna na hora. `isGenerating` é removido. Dock mostra contagem de jobs ativos (`"Gerar (2 rodando)"`) só pra info — não desabilita.

## Detalhes técnicos

**Arquivos novos:**
- `src/refine/RefineLayout.tsx` — layout com `<Outlet/>`, sidebar, rail, jobs panel
- `src/refine/pages/{HomePage,ImagePage,VideoPage,AudioPage,EditPage,UpscalePage,CinemaPage,ProductPage,EcommercePage,CharacterPage,R3DPage,DepthPage,AssetsPage,MarketingPage,ExplorePage,ProjectsPage}.tsx`
- `src/refine/tools/{image,video,audio,edit,upscale,cinema,product,ecommerce,character,r3d,depth,assets,marketing}.ts` — um handler `run*` por ferramenta
- `src/refine/lib/jobs.tsx` — `JobsProvider`, `useJobs()`, `enqueue()`
- `src/refine/components/JobsPanel.tsx` — UI da fila
- `src/refine/components/ToolOptionsBar.tsx` — barra de opções específicas (cada page passa as suas)

**Arquivos modificados:**
- `src/App.tsx` — adicionar nested routes `/app/refine/*`
- `src/refine/components/Sidebar.tsx` — usar `NavLink`/`useLocation`
- `src/refine/components/Dock.tsx` — botão Gerar dispara `enqueue` e não bloqueia
- `src/refine/RefineApp.tsx` — vira `RefineLayout` (ou deletado se virar layout puro)
- `src/refine/lib/tool-actions.ts` — substituído pelos handlers individuais
- `src/refine/hooks/useGenerations.ts` — `pollGeneration` exposto pra `JobsProvider`

**Backend:** nenhuma mudança — as edge functions `generate-image/video/edit-image/upscale-image/generate-audio/task-status` já existem e funcionam. Cada handler chama a função certa.

## Resultado pro usuário

- Clica em **Image** → vai pra `/app/refine/image` (URL própria, dá pra favoritar).
- Cada ferramenta mostra só os controles que fazem sentido pra ela.
- Clica **Gerar** → form limpa, job aparece no painel "Jobs em andamento", já pode mandar outro ou trocar de aba.
- 3 imagens + 1 vídeo rodando em paralelo, cada um cai no Rail quando pronto, com toast.