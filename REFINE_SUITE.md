# Refine SaaS — Suite Tools

Tools registradas no app router (`/app/...`):

- `/app/suite` — Suite (hub central, criada por outro agente)
- `/app/audio` — AudioStudio (TTS / music / SFX / voice clone)
- `/app/edit` — EditStudio (inpaint / outpaint / remove / style transfer)
- `/app/specialized` — SpecializedStudio (multi-view, hair, age, headshot pro, e-commerce, restoration, etc.)
- `/app/captions` — CaptionsStudio (caption / hashtags / story / carousel / brand voice)
- `/app/drive` — DriveStudio (importar pasta do Google Drive, listar imports)
- `/app/batch` — BatchStudio (lote de imagens por persona+templates, lote de vídeos)
- `/app/learn` — LearnStudio (aprender estilo a partir de import do Drive)
- `/app/recreate` — RecreateStudio (recriar fotos do Drive com persona + skin/magnific/preserve_logos)
- `/app/presets` — PresetsCatalog (catálogo de model presets, "Usar este modelo" → cria persona)
- `/app/worlds` — WorldsCatalog (mundos pré-construídos, "Criar com este world" → /app/generate?world=id)

Componentes compartilhados:
- `src/components/ImageDropzone.tsx` — upload via `api.uploads.signedUrl` + PUT direto no storage.
- `src/components/JobStatus.tsx` — polling genérico de `api.enhance.task` cada 3s, `onComplete(urls)`.
