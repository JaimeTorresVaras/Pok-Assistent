-- Fase 5: soporte de ingesta de torneos.

-- Récord del equipo en el torneo (para calcular winrate por Pokémon).
alter table tournament_teams add column if not exists wins integer;
alter table tournament_teams add column if not exists losses integer;

-- Estado del pipeline de ingesta (marca de agua de torneos ya procesados,
-- PLAN.md §6 paso 1: "traer solo lo nuevo").
create table if not exists ingest_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table ingest_state enable row level security;
