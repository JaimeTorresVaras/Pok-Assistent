# champions-ev-ai · Pok-Assistent

Asistente con IA de EVs para **Pokémon Champions** (VGC dobles, Reg. **M-B**). Eliges tu
equipo de 6 y el sistema propone EVs, naturaleza, ítem y movimientos optimizados contra
el meta — apoyado en datos reales de uso y en cálculo de daño verificado.

> **Idea central:** la IA propone y prioriza; **el código verifica los números**.
> Plan completo y roadmap por fases en **[PLAN.md](./PLAN.md)**.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript** · **Tailwind CSS v4**
- **@smogon/calc** (motor de daño) · **@pkmn/dex · @pkmn/data** (Pokédex)
- **Vitest** · **ESLint + Prettier**
- **Postgres + pgvector** y **Voyage AI** (RAG) · hosting en **Railway**
- _(próximas fases)_ **@pkmn/sets** (ingesta) y **API de Claude** (asesor IA).

## Arquitectura (hexagonal / puertos y adaptadores)

El núcleo no conoce frameworks ni librerías; todo lo externo entra por puertos.

```
src/
├── core/                    NÚCLEO (cero dependencias externas)
│   ├── domain/              modelo + fórmula de stats + utils EVs/Showdown (puro)
│   ├── ports/               PokedexPort · RegulationDataPort · MetaUsagePort
│   │                        DamageCalcPort · SetRetrievalPort (F5) · AdvisorPort (F6)
│   └── usecases/            LegalityService · EVOptimizer · RecommendTeamUseCase
├── adapters/                IMPLEMENTAN los puertos
│   ├── pkmn/                Pokédex vía @pkmn (stats, tipos, movepools)
│   ├── smogon/              daño vía @smogon/calc (dobles, nivel 50)
│   └── static/              allowlist + usage del meta (placeholder → Fase 5)
├── composition/             container.ts — composition root (une puertos y adaptadores)
├── app/                     ADAPTADOR DE ENTRADA: UI Next.js + /api/recommend
├── components/              Team Builder · tarjetas · panel de amenazas · export Showdown
└── ingest/                  pipeline de ingesta de torneos (stub, Fase 5)
```

Reglas: `core/` nunca importa de `adapters/` ni de `app/`; solo `composition/`
conoce ambos lados; los números de daño/stats salen siempre de los puertos
deterministas (la IA nunca es la fuente de verdad de un número).

## Requisitos

- Node.js ≥ 20 (probado con 22)
- npm

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa tus claves cuando toque (Fases 4+)
npm run dev                  # http://localhost:3000
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm test` / `npm run test:watch` | Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run typecheck` | Chequeo de tipos (`tsc --noEmit`) |

## API

`POST /api/recommend` — body `{ "team": ["Garchomp", ...], "regulation": "M-B" }` →
`{ "recommendations": [...] }` con set recomendado, razonamiento y **benchmarks
verificados** por el motor de daño (400 si hay ilegales, repetidos o body inválido).

## Fase 4 — Base de datos + vector store (RAG)

Hosting: **Railway** (app + Postgres/pgvector + cron, todo en la misma plataforma).
El código de la capa de datos ya está listo (esquema, adaptadores y retrieval);
para **activarlo** hacen falta dos credenciales en `.env.local`:

1. **Railway Postgres con pgvector** — en tu proyecto de Railway: *New → Database*
   con el template [pgvector](https://railway.com/deploy/pgvector-latest). Copia la
   URL **pública** (servicio Postgres → pestaña *Connect* → Public Network) en
   `DATABASE_URL` para desarrollo local. (En producción, la app desplegada en
   Railway usará la URL interna `*.railway.internal` — Fase 8.)
2. **Voyage AI** — crea una API key en [dashboard.voyageai.com](https://dashboard.voyageai.com)
   y ponla en `VOYAGE_API_KEY`.
3. Aplica el esquema: `npm run db:migrate` (crea `tournament_teams`,
   `doc_embeddings` con índice HNSW y `usage_stats`; ver `db/migrations/`).
4. `npm test` — los tests de integración de Postgres corren automáticamente
   cuando `DATABASE_URL` está presente (sin ella se saltan).

Piezas: `EmbeddingsPort` → adaptador **Voyage** (`voyage-3.5`, 1024 dims,
configurable con `VOYAGE_MODEL`) · `TournamentStorePort` → adaptador
**Postgres/pgvector** · caso de uso **RetrieveSets** (implementa
`SetRetrievalPort`: embed de la consulta + similitud coseno + filtros por
regulación/Pokémon/fecha). La ingesta que puebla estas tablas es la Fase 5.

## Fase 5 — Ingesta de torneos (el RAG se actualiza solo)

Pipeline: **Pikalytics** (índice + página del torneo: ranks, récord W-L, especies
canónicas) → **Limitless** (teamlist: ítem, habilidad, **naturaleza real** y
movimientos por Pokémon) → validación de legalidad → upsert en Postgres →
embeddings de Voyage (solo docs nuevos) → **recálculo de usage con decaimiento
temporal** (vida media 14 días) → marca de agua de torneos procesados.

```bash
npm run ingest                                   # defaults: 3 torneos nuevos, top 16
npm run ingest -- --max-tournaments=5 --max-placement=8
npm run rag:query -- --pokemon=Garchomp          # debug: qué recupera el RAG
```

Notas de datos: Champions no publica EVs ni Tera en teamsheets (los spreads
agregan la naturaleza real; los EVs se siguen derivando). Las megas exclusivas
de Champions (p. ej. Raichu-Mega-X) se aceptan vía su especie base. El free
tier de Voyage (10K tokens/min) se maneja con lotes de 64 + reintentos ante
429 (configurable con `VOYAGE_MAX_BATCH`).

### Cron en Railway (Fase 8)

Crear un **servicio nuevo del mismo repo** en Railway con:
- Comando de start: `npm run ingest -- --max-tournaments=5`
- **Cron Schedule**: `0 6 * * *` (diario a las 06:00 UTC; los torneos grandes
  cierran el fin de semana)
- Variables: `DATABASE_URL` (la interna `*.railway.internal`), `VOYAGE_API_KEY`

El proceso corre, termina y Railway lo agenda de nuevo — sin timeouts serverless.

## Estado

✅ Fases 0–3 + **Fase 7 (primer corte)** con **datos reales de la Reg. M-B**:
- Allowlist real: roster completo de Champions (209 especies, Bulbapedia); megas y
  formas aceptadas vía especie base (p. ej. Charizard-Mega-Y).
- Meta real: top 12 de uso de torneos (Pikalytics/Limitless, jul 2026) con % reales
  de uso, winrate, movimientos, ítems y habilidades. Ver `src/adapters/static/data/`
  (cada JSON registra fuente y fecha).

⚠️ Limitaciones conocidas (documentadas en el código):
- Las fuentes públicas no exponen spreads de EVs/naturalezas de Champions → el spread
  se deriva de las stats base y se declara como genérico en el razonamiento.
- Los learnsets vienen de los juegos principales vía `@pkmn`; el movepool exacto de
  Champions puede diferir. Las megas exclusivas de Champions (p. ej. Mega Staraptor)
  aún no existen en `@pkmn`/`@smogon/calc` y se saltan en los benchmarks.
- Dataset manual: la ingesta automática de torneos llega en la Fase 5.

✅ **Fase 4 (código)**: esquema Postgres+pgvector, adaptadores Voyage/Postgres y
retrieval por similitud — pendiente solo de credenciales de Railway/Voyage (ver
sección Fase 4). Hosting decidido: **Railway** (app + DB + cron).

Siguiente: Fase 5 (ingesta de torneos que puebla el RAG) y Fase 6 (AIAdvisor
con Claude vía `AdvisorPort`). Ver [PLAN.md §8](./PLAN.md).
