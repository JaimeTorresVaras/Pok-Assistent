# champions-ev-ai · Pok-Assistent

Asistente con IA de EVs para **Pokémon Champions** (VGC dobles, Reg. **M-B**). Eliges tu
equipo de 6 y el sistema propone EVs, naturaleza, ítem y movimientos optimizados contra
el meta — apoyado en datos reales de uso y en cálculo de daño verificado.

> **Idea central:** la IA propone y prioriza; **el código verifica los números**.
> Plan completo y roadmap por fases en **[PLAN.md](./PLAN.md)**.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**
- **Tailwind CSS v4**
- **ESLint + Prettier**
- _(próximas fases)_ **@smogon/calc**, **@pkmn/dex · @pkmn/data · @pkmn/sets**,
  **API de Claude**, **Postgres + pgvector (Supabase)** y **Voyage AI**.

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
| `npm run lint` | ESLint |
| `npm run format` | Formatea el código con Prettier |
| `npm run format:check` | Verifica el formato sin escribir |
| `npm run typecheck` | Chequeo de tipos (`tsc --noEmit`) |

## Estructura

```
src/
├── app/        # Rutas y UI (Next.js App Router)
├── types/      # Tipos de dominio (ThreatMon, TournamentDoc, Recommendation…)
├── services/   # MetaService · DexService · CalcEngine · EVOptimizer
│               #   Retriever · AIAdvisor · Verifier
└── ingest/     # Pipeline de ingesta de torneos (RAG)
```

## Estado

🚧 **Fase 0 completada** (andamiaje). Los servicios son stubs tipados; cada uno indica
en qué fase se implementa. Siguiente: **Fase 1** (DexService + legalidad por regulación)
y **Fase 2** (CalcEngine). Ver [PLAN.md §8](./PLAN.md).
