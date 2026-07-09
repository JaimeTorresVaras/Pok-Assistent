-- Fase 4: esquema base para el RAG (PLAN.md §2 "DATOS" y §3).
-- Postgres + pgvector (Supabase). Aplicar con `npm run db:migrate`.

create extension if not exists vector;

-- Un registro por Pokémon-en-equipo de torneo (TournamentDoc, PLAN.md §3).
-- Es la unidad de ingesta del RAG; el texto descriptivo se embebe aparte.
create table if not exists tournament_teams (
  id          text primary key,          -- p. ej. "limitless-2026-07-05-place3-garchomp"
  source      text not null,             -- Limitless VGC, Victory Road, ...
  tournament  text not null,
  date        date not null,
  regulation  text not null,             -- "M-B"
  placement   integer not null,
  player      text not null default '',
  pokemon     text not null,
  set         jsonb not null,            -- PokemonSet parseado con @pkmn/sets
  teammates   text[] not null default '{}',
  doc_text    text not null,             -- el "documento" que se embebe
  created_at  timestamptz not null default now()
);

create index if not exists tournament_teams_reg_pokemon_date_idx
  on tournament_teams (regulation, pokemon, date desc);

-- Vectores separados de los docs para poder re-embeder si cambia el modelo
-- (riesgo "deriva del vector store", PLAN.md §9). La dimensión 1024 coincide
-- con voyage-3.5 (output_dimension por defecto); si cambias de modelo con
-- otra dimensión, necesitas una migración nueva.
create table if not exists doc_embeddings (
  doc_id          text primary key references tournament_teams(id) on delete cascade,
  embedding       vector(1024) not null,
  embedding_model text not null,
  created_at      timestamptz not null default now()
);

create index if not exists doc_embeddings_hnsw_idx
  on doc_embeddings using hnsw (embedding vector_cosine_ops);

-- Usage agregado por regulación+pokemon. Lo recalcula la ingesta (Fase 5)
-- con decaimiento temporal; misma forma que ThreatMon del dominio.
create table if not exists usage_stats (
  regulation  text not null,
  pokemon     text not null,
  usage_pct   numeric not null,
  winrate_pct numeric,
  moves       jsonb not null default '[]',
  items       jsonb not null default '[]',
  abilities   jsonb not null default '[]',
  spreads     jsonb not null default '[]',
  tera_types  jsonb not null default '[]',
  sample_size integer not null default 0,
  computed_at timestamptz not null default now(),
  primary key (regulation, pokemon)
);

-- Nuestra app usa conexión directa (DATABASE_URL), pero Supabase también
-- expone una API REST pública sobre estas tablas: RLS activado sin políticas
-- la bloquea por defecto.
alter table tournament_teams enable row level security;
alter table doc_embeddings enable row level security;
alter table usage_stats enable row level security;
