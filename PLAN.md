# Plan: Asistente IA de EVs para Pokémon Champions (Reg. M-B)

> **Objetivo:** una web donde eliges tu equipo de 6, y un sistema con IA —apoyado en datos reales de uso del meta y en cálculo de daño verificado— te propone los mejores EVs, la naturaleza, el ítem y los movimientos más usados para cada Pokémon, pensados para rendir contra las amenazas más jugadas de la temporada.

---

## 0. Contexto del formato (verificado, jul 2026)

- **Juego:** Pokémon Champions.
- **Regulación activa:** **Set M-B** (17 jun – 2 sep 2026). El plan debe ser *parametrizable por regulación*, porque cambia cada pocos meses.
- **Formato:** Dobles VGC. Se llevan 6, se eligen 4 por combate. Todos a nivel 50. Species Clause + Item Clause. Mega evoluciones permitidas (todas las previas + 16 nuevas en M-B).
- **Pool = allowlist:** solo son legales los Pokémon de la lista permitida de la regulación (no es banlist). El sistema **debe** filtrar por esa lista.
- **Fuentes de uso del meta:** Pikalytics (`/champions`), Pokémon Zone, Victory Road, Pokékipe. Muestran top de uso, movimientos, ítems, habilidades y cores. **Ninguna expone API pública oficial** → hay que scrapear o mantener el dataset a mano.

> **Decisiones asumidas** (cambiables): stack **Next.js + TypeScript**, motor de daño **@smogon/calc**, IA con **API de Claude**, base de datos **Postgres + pgvector (Supabase)**, embeddings **Voyage AI**, datos **híbridos** (dataset manual del top del meta ahora + **RAG que se actualiza solo con los resultados de torneos**), optimizador **auto + ajuste fino**.
>
> **Actualización (jul 2026):** hosting consolidado en **Railway** — app Next.js, **Postgres + pgvector** (reemplaza a Supabase) y **cron de ingesta** como servicio del mismo repo (reemplaza a Vercel + Vercel Cron en las Fases 4, 5 y 8). Motivo: plataforma ya contratada, procesos reales sin timeouts serverless para la ingesta y la IA.

---

## 1. Idea central: la IA propone, el código verifica

El riesgo #1 de "IA + Pokémon" es que el modelo **alucine números** (EVs que no cuadran, cálculos de daño inventados). La arquitectura lo evita separando responsabilidades:

1. **Datos duros (determinista):** stats base, movepools, y datos de uso reales del meta → de dataset/scraper.
2. **RAG (frescura):** un vector store con los **equipos y sets de torneos recientes**; se recupera lo más relevante y actual para tu equipo y las amenazas antes de razonar.
3. **Motor de daño (determinista):** `@smogon/calc` calcula daño real de cada set contra cada amenaza.
4. **IA (razonamiento):** Claude recibe *solo datos reales* (usage estructurado + sets recuperados por RAG) como contexto y propone spreads de EVs + movimientos + justificación en lenguaje natural.
5. **Verificador (determinista):** cada spread que propone la IA se **recalcula en código** (los benchmarks que dice cumplir se comprueban con `@smogon/calc` y con la fórmula de stats). Si no cuadra, se corrige o se descarta antes de mostrarlo.

Regla de oro: **la IA nunca es la fuente de verdad de un número.** Explica, prioriza y decide trade-offs; los números los valida el motor.

---

## 2. Arquitectura

```
┌────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                    │
│  Team Builder (elige 6) → Panel de recomendaciones por mon   │
│  Calculadora de benchmarks en vivo (sliders de EVs)          │
│  "Novedades del meta" (qué cambió en los últimos torneos)    │
└───────────────┬────────────────────────────────────────────┘
                │  /api/recommend  (server actions / route handlers)
┌───────────────▼────────────────────────────────────────────┐
│                    BACKEND / CAPA DE SERVICIO                 │
│  1) MetaService   → top Pokémon + sets/ítems/moves usados    │
│  2) DexService    → stats base, tipos, movepools, legalidad  │
│  3) CalcEngine    → @smogon/calc (daño, OHKO/2HKO, benchmarks)│
│  4) EVOptimizer   → búsqueda de spreads que cumplen objetivos │
│  5) Retriever     → RAG: recupera sets de torneos recientes   │
│  6) AIAdvisor     → Claude: prioriza objetivos + explica      │
│  7) Verifier      → revalida todo lo que propone la IA        │
└───────┬───────────────────────────────────────────┬─────────┘
        │                                            │
┌───────▼──────────────────────┐      ┌──────────────▼─────────────────┐
│  INGESTA DE TORNEOS (cron)   │      │            DATOS               │
│  Fetch resultados/pastes  →  │      │  Postgres + pgvector (Supabase)│
│  Parse team pastes        →  │─────▶│  · tournament_teams (raw+meta) │
│  Recalcula usage stats    →  │      │  · doc_embeddings (vectores)   │
│  Embeddings (Voyage)      →  │      │  · usage_stats (agregado)      │
│  Resumen "qué cambió" (IA)   │      │  dex (@pkmn) · cache           │
└──────────────────────────────┘      └────────────────────────────────┘
        ▲
   Fuentes: Limitless VGC · Victory Road · RK9 · Pikalytics (pastes de torneo)
```

### Librerías clave (ecosistema `@pkmn`)
- **`@smogon/calc`** — cálculo de daño oficial, soporta Gen 9 / dobles.
- **`@pkmn/dex` / `@pkmn/data`** — stats base, tipos, movepools, ítems, habilidades. Evita hardcodear la Pokédex.
- **`@pkmn/sets`** — parsear/exportar en formato Showdown. **Clave para la ingesta**: convierte los pastes de torneo en sets estructurados (EVs, naturaleza, ítem, movimientos, Tera).
- **Anthropic SDK** (`@anthropic-ai/sdk`) — para el AIAdvisor y los resúmenes de meta.

### Stack RAG / datos
- **Postgres + `pgvector`** (Supabase, con free tier) — guarda en un solo sitio: sets de torneo, usage agregado y los vectores. SQL + búsqueda vectorial juntas.
- **Voyage AI** (`voyage-3` o similar) — embeddings recomendados para usar junto a Claude. *(Alternativas: OpenAI `text-embedding-3`, Cohere.)*
- **Voyage Reranker** (opcional) — reordena los sets recuperados por relevancia antes de pasarlos a Claude.
- **Vercel Cron** — dispara la ingesta periódica (p. ej. cada lunes tras el fin de semana de torneos).
- *(Alternativa embebida para dev local: LanceDB, sin servidor.)*

---

## 3. Modelo de datos

**Amenaza del meta** (lo que scrapeamos/mantenemos):
```jsonc
{
  "regulation": "M-B",
  "pokemon": "Garchomp",
  "usagePct": 41.2,
  "moves":   [{ "name": "Earthquake", "pct": 88 }, { "name": "Protect", "pct": 72 }, ...],
  "items":   [{ "name": "Life Orb", "pct": 34 }, { "name": "Loaded Dice", "pct": 21 }],
  "abilities":[{ "name": "Rough Skin", "pct": 61 }],
  "spreads": [{ "nature": "Jolly", "evs": "252 Atk / 4 Def / 252 Spe", "pct": 45 }],
  "teraTypes":[{ "type": "Steel", "pct": 30 }]
}
```

**Documento de torneo** (unidad de ingesta del RAG; un registro por Pokémon-en-equipo):
```jsonc
{
  "id": "limitless-2026-07-05-place3-garchomp",
  "source": "Limitless VGC",
  "tournament": "Regional Santiago 2026",
  "date": "2026-07-05",
  "regulation": "M-B",
  "placement": 3,
  "player": "…",
  "pokemon": "Garchomp",
  "set": {                       // parseado con @pkmn/sets desde el paste
    "nature": "Jolly", "item": "Clear Amulet", "ability": "Rough Skin",
    "teraType": "Steel",
    "evs": { "atk": 252, "spe": 252, "hp": 4 },
    "moves": ["Stomping Tantrum", "Dragon Claw", "Protect", "Swords Dance"]
  },
  "teammates": ["Sinistcha", "Whimsicott", "Kingambit", "Amoonguss", "Basculegion"],
  "text": "Garchomp @ Clear Amulet — Jolly, 252 Atk/4 HP/252 Spe, Tera Steel, moves: …, en el equipo top-3 de Santiago 2026 junto a …",  // el "documento" que se embebe
  "embedding": [ /* vector Voyage */ ]
}
```
> El campo `text` es lo que se convierte en vector. Se recupera por similitud + filtros (regulación, fecha, Pokémon) y se recalcula el `usage_stats` agregado a partir de estos registros.

**Recomendación de salida** (lo que produce el sistema para cada mon del usuario):
```jsonc
{
  "pokemon": "Amoonguss",
  "recommended": {
    "nature": "Calm",
    "item": "Sitrus Berry",
    "evs": { "hp": 236, "def": 36, "spd": 236 },
    "moves": ["Spore", "Rage Powder", "Pollen Puff", "Protect"]
  },
  "reasoning": "Máximo HP/SpD para aguantar 2 ataques de <amenaza X>...",
  "benchmarks": [
    { "goal": "Sobrevive Shadow Ball de Sinistcha +2", "target": "≥ ...", "verified": true },
    { "goal": "OHKO no requerido (rol de soporte)", "verified": true }
  ],
  "meta_moves": ["Spore 91%", "Rage Powder 84%", ...]   // los más usados, del dataset
}
```

---

## 4. El optimizador de EVs (corazón técnico)

Para dobles VGC, el enfoque estándar es **spreads orientados a benchmarks**, no fuerza bruta ciega:

1. **Definir objetivos** por Pokémon según su rol (atacante, soporte, tanque). La IA propone los objetivos priorizados a partir de las amenazas top; ejemplos:
   - *Ofensivo:* "garantizar OHKO/2HKO contra las amenazas A, B, C con su spread más común".
   - *Defensivo:* "sobrevivir el ataque X de la amenaza Y con margen para bayas/Sitrus".
   - *Velocidad:* "superar a la amenaza Z (o su creep común)".
2. **Resolver EVs mínimos** para cada objetivo con la fórmula de stats a nivel 50 (paso de 4 EVs). Esto es determinista y barato.
3. **Asignar 508 EVs** repartiendo entre objetivos según prioridad; el sobrante va a un stat útil.
4. **Verificar con `@smogon/calc`** todos los cálculos de daño reales (tipos, ítems, campo, spread damage x0.75 en dobles).
5. **Iterar**: si no caben todos los objetivos en 508 EVs, la IA decide qué sacrificar y lo explica.

> Empezar con **búsqueda por benchmarks** (rápida y explicable). Dejar como mejora futura un optimizador multi-objetivo más sofisticado.

---

## 5. Integración de IA (el "asistente")

**Flujo "elige tu 6 → recomendaciones":**

1. Usuario elige 6 Pokémon (autocompletado filtrado por legalidad de la regulación).
2. Backend arma el **contexto real**: top del meta con sets/ítems/moves + stats base de los 6 + resultados de daño relevantes del CalcEngine.
3. **Claude** (con *tool use* / salida estructurada) recibe ese contexto y devuelve, por cada mon: objetivos priorizados, naturaleza, ítem, 4 movimientos (sesgados hacia los más usados del dataset) y justificación. **No inventa stats**: se le pasan los números y se le pide razonar sobre ellos.
4. **EVOptimizer + Verifier** convierten los objetivos en EVs concretos y los revalidan.
5. Se muestra la recomendación + los benchmarks verificados + los movimientos más usados (con su %).

**Puntos finos de IA:**
- Usar **salida estructurada (JSON schema / tool use)** para que la respuesta sea parseable, no prosa libre.
- Pasar el uso real como *grounding* y pedir explícitamente que cite el % de uso al recomendar un movimiento.
- Cachear recomendaciones por (equipo + regulación) para no re-llamar al modelo innecesariamente.
- Modo "explica esta decisión": el usuario pregunta y la IA responde usando los benchmarks ya calculados.

---

## 6. RAG y actualización continua (aprender de cada torneo)

El sistema no se queda con una foto fija del meta: **ingiere los equipos de los torneos que se van jugando** y ajusta sus recomendaciones.

**Pipeline de ingesta (job programado con Vercel Cron):**
1. **Fetch** — descarga resultados y team pastes nuevos de las fuentes (Limitless VGC, Victory Road, RK9, pastes de Pikalytics). Se guarda la marca del último torneo procesado para traer solo lo nuevo.
2. **Parse** — con `@pkmn/sets`, cada paste se convierte en set estructurado (EVs, naturaleza, ítem, Tera, movimientos) + metadatos (torneo, fecha, puesto, regulación).
3. **Deduplicar y validar** — descartar duplicados y sets ilegales para la regulación activa.
4. **Recalcular usage** — regenerar `usage_stats` agregados (con **decaimiento temporal**: los torneos recientes pesan más que los viejos) y qué movimientos/ítems son los más usados por Pokémon.
5. **Embeddings** — generar el vector (Voyage) del campo `text` de cada documento y guardarlo en `pgvector`.
6. **Resumen de meta (IA)** — Claude produce un "qué cambió esta semana" (Pokémon subiendo/bajando, tech nueva) que se muestra en el frontend.

**Retrieval en el momento de recomendar:**
- Para cada mon del usuario y cada amenaza top, el `Retriever` recupera los **sets de torneo más relevantes y recientes** por similitud vectorial + filtros (`regulation`, `date >= …`, `pokemon`).
- (Opcional) reranking con Voyage para quedarse con los mejores k.
- Esos sets reales entran como *grounding* al `AIAdvisor`, junto al usage estructurado. Así las recomendaciones reflejan lo que **de verdad** se está jugando y ganando, no solo lo que estaba de moda hace meses.

**Por qué RAG y no solo la tabla de usage:** la tabla agregada te da los %; el RAG te da el **contexto cualitativo y fresco** (spreads concretos de equipos ganadores, combinaciones/cores emergentes, tech sorpresa) y permite que la IA "cite ejemplos" reales al justificar una recomendación. Se complementan: números duros de la tabla, matices y novedad del RAG.

---

## 7. Frontend / UX

- **Team Builder:** buscador con sprites, filtrado por regulación, chips de los 6 elegidos.
- **Tarjeta por Pokémon:** naturaleza + ítem + spread de EVs (barras) + 4 movimientos + "por qué" plegable + lista de benchmarks con ✓/✗.
- **Calculadora en vivo:** sliders de EVs que recalculan al instante qué amenazas sobrevives / matas (ajuste fino sobre la sugerencia auto).
- **Vista de amenazas:** panel lateral con el top del meta y contra quién está optimizado tu equipo.
- **Export:** botón "copiar en formato Showdown" para pegar en el juego/simulador.

---

## 8. Roadmap por fases (para ejecutar en Claude Code)

**Fase 0 — Andamiaje (0.5 día)**
- Repo Next.js + TS, ESLint/Prettier, estructura de carpetas, `.env` (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `DATABASE_URL`).

**Fase 1 — Datos + Dex (1–2 días)**
- Integrar `@pkmn/dex`/`@pkmn/data`. Cargar `meta_reg-mb.json` (top ~30 a mano al inicio). Servicio de legalidad por regulación.

**Fase 2 — Motor de daño (1 día)**
- Envolver `@smogon/calc` en `CalcEngine` (dobles, nivel 50, spread damage). Tests con casos conocidos.

**Fase 3 — Optimizador de EVs (2–3 días)**
- Fórmula de stats nivel 50, resolvedor de benchmarks, asignación de 508 EVs, Verifier. Tests unitarios de cada benchmark.

**Fase 4 — Base de datos + vector store (1 día)**
- Supabase (Postgres + `pgvector`). Esquema: `tournament_teams`, `usage_stats`, `doc_embeddings`. Cliente de Voyage para embeddings.

**Fase 5 — Ingesta de torneos + RAG (3–4 días)** ⭐ *núcleo del "se actualiza solo"*
- Parser de team pastes con `@pkmn/sets`. Conectores a fuentes (empezar por 1: Limitless o Victory Road). Recalcular usage con decaimiento temporal. Generar embeddings. `Retriever` (similitud + filtros + rerank opcional). Job de Vercel Cron.

**Fase 6 — Capa de IA (2 días)**
- `AIAdvisor` con Anthropic SDK + salida estructurada, con *grounding* de usage estructurado **y** sets recuperados por RAG. Resumen "qué cambió en el meta". Verifier sobre lo que devuelve.

**Fase 7 — Frontend (2–3 días)**
- Team Builder, tarjetas de recomendación, calculadora en vivo, panel "Novedades del meta", export Showdown.

**Fase 8 — Deploy (0.5 día)**
- Vercel. Secrets (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `DATABASE_URL`). Cron de ingesta activo. Caché de recomendaciones.

> **Ruta mínima para ver el RAG funcionando cuanto antes:** Fases 0 → 1 → 4 → 5. Con eso ya ingiere torneos y recupera sets; luego añades cálculo (2–3), IA (6) y UI (7).

---

## 9. Riesgos y mitigaciones

- **Alucinación de la IA** → Verifier determinista; la IA nunca fija números finales. El RAG además la ancla a sets reales.
- **Fragilidad del scraping/ingesta** (webs cambian) → empezar con dataset manual; conectores aislados y con tests; fallback al último dato válido; procesar solo torneos nuevos (marca de agua).
- **Datos de torneo ruidosos** (sets troll, pastes incompletos) → validar legalidad, deduplicar, ponderar por puesto y por recencia (decaimiento temporal).
- **Deriva del vector store** → re-embeder si cambias de modelo de embeddings; versiona el `embedding_model` en cada registro.
- **Legalidad de datos** → uso personal/derivado; revisar TOS de cada fuente antes de ingerir a escala; respetar rate limits.
- **Cambio de regulación** → todo parametrizado por `regulation`; dataset, allowlist y filtros del RAG intercambiables.
- **Coste de API** (embeddings + IA) → embeder solo documentos nuevos; cachear recomendaciones por equipo+regulación; usar el modelo justo para cada tarea.
- **Complejidad de dobles** (spread damage, redirección, clima, Tera) → cubrir con tests del CalcEngine desde el inicio.

---

## 10. Primer prompt sugerido para arrancar en Claude Code

> "Crea un proyecto Next.js + TypeScript llamado `champions-ev-ai`. Instala `@smogon/calc`, `@pkmn/dex`, `@pkmn/data`, `@pkmn/sets`, `@anthropic-ai/sdk` y el cliente de Voyage. Configura Supabase (Postgres + pgvector) con las tablas `tournament_teams`, `usage_stats` y `doc_embeddings`. Monta la estructura de carpetas de la arquitectura del plan (services: MetaService, DexService, CalcEngine, EVOptimizer, Retriever, AIAdvisor, Verifier; más un módulo `ingest/`). Implementa primero DexService (legalidad por regulación) y CalcEngine con tests, usando datos de la Regulación M-B. Empieza por las Fases 1 y 2 del roadmap."

Cuando eso funcione, un segundo prompt para el RAG:

> "Implementa la Fase 5: un pipeline de ingesta en `ingest/` que descargue team pastes de torneos [fuente], los parsee con `@pkmn/sets`, recalcule `usage_stats` con decaimiento temporal, genere embeddings con Voyage y los guarde en `doc_embeddings`. Añade el `Retriever` (búsqueda por similitud + filtros por regulación/fecha/Pokémon) y un endpoint de cron para Vercel. Incluye tests del parser y del recálculo de usage."

Luego avanzas fase por fase, pidiendo tests en cada una.
