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
- _(próximas fases)_ **@pkmn/sets**, **API de Claude**, **Postgres + pgvector (Supabase)**
  y **Voyage AI**.

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

Siguiente: Fase 4–5 (DB + RAG + ingesta) y Fase 6 (AIAdvisor con Claude vía
`AdvisorPort`). Ver [PLAN.md §8](./PLAN.md).
