# champions-ev-ai

Asistente con IA de EVs para **Pokémon Champions** (VGC dobles). Eliges tu equipo de 6 y el
sistema propone EVs, naturaleza, ítem y movimientos optimizados contra el meta —
apoyado en datos reales de uso y en cálculo de daño verificado.

> **Idea central:** la IA propone y prioriza; el código verifica los números.
> Ver el plan completo en [PLAN.md](./PLAN.md).

## Estado

🚧 En construcción — Fase 0 (andamiaje).

## Stack previsto

- **Next.js + TypeScript**
- **@smogon/calc** — motor de daño
- **@pkmn/dex · @pkmn/data · @pkmn/sets** — Pokédex y parseo de sets
- **API de Claude** (`@anthropic-ai/sdk`) — razonamiento del asistente
- **Postgres + pgvector (Supabase)** + **Voyage AI** — datos y RAG

## Desarrollo

```bash
npm install
npm run dev
```

_(Instrucciones completas se irán agregando a medida que avancen las fases del plan.)_
