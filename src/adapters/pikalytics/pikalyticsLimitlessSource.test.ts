import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PikalyticsLimitlessSource,
  canonicalName,
  decodeEntities,
  normalizeLimitlessName,
  parseLimitlessTeamlist,
  parseTournamentListing,
  parseTournamentPage,
  toISODate,
} from "@/adapters/pikalytics/pikalyticsLimitlessSource";

const fx = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");

describe("parsers puros (con fixtures HTML reales)", () => {
  it("toISODate y decodeEntities", () => {
    expect(toISODate("algo Jul 6, 2026 algo")).toBe("2026-07-06");
    expect(toISODate("sin fecha")).toBeNull();
    expect(decodeEntities("Pok&#xE9;mon &amp; co")).toBe("Pokémon & co");
  });

  it("parseTournamentListing: solo torneos terminados, con fecha y jugadores", () => {
    const tournaments = parseTournamentListing(fx("listing.html"));
    expect(tournaments.map((t) => t.slug)).toEqual([
      "the-drywalls-series-10-8e3d02",
      "intimidators-champions-challenge-24-reg-m-b-8e4933",
    ]); // la fila live (jbe-interno) se salta
    expect(tournaments[0]).toMatchObject({
      name: "The Drywalls Series #10",
      date: "2026-07-06",
      source: "limitless",
      players: 76,
    });
  });

  it("parseTournamentPage: fecha, rank, jugador, récord, link y especies canónicas", () => {
    const page = parseTournamentPage(fx("tournament.html"));
    expect(page.date).toBe("2026-07-06");
    expect(page.teams.length).toBe(2);

    const first = page.teams[0];
    expect(first.placement).toBe(1);
    expect(first.player).toBe("Altkyle");
    expect(first.playerSlug).toBe("altkyle");
    expect(first.limitlessId).toBe("6a4b90f0063cb29d318e4933");
    expect(first.wins).toBe(8);
    expect(first.losses).toBe(1);
    expect(first.pokemonNames).toHaveLength(6);
    expect(first.pokemonNames).toContain("Dragonite-Mega");
  });

  it("parseLimitlessTeamlist: 6 sets con naturaleza/ítem/habilidad/moves reales", () => {
    const sets = parseLimitlessTeamlist(fx("teamlist.html"));
    expect(sets).toHaveLength(6);

    const dragonite = sets[0];
    expect(dragonite.pokemon).toBe("Dragonite");
    expect(dragonite.set.item).toBe("Dragoninite");
    expect(dragonite.set.ability).toBe("Inner Focus");
    expect(dragonite.set.nature).toBe("Modest");
    expect(dragonite.set.moves).toEqual(["Dragon Pulse", "Flamethrower", "Tailwind", "Protect"]);
    expect(dragonite.set.evs).toEqual({}); // EVs no públicos en Champions
    expect(dragonite.set.teraType).toBe(""); // sin Tera en Champions
  });

  it("canonicalName resuelve megas con los nombres de Pikalytics", () => {
    const pika = ["Dragonite-Mega", "Basculegion", "Scizor-Mega"];
    expect(canonicalName("Dragonite", pika)).toBe("Dragonite-Mega");
    expect(canonicalName("Basculegion", pika)).toBe("Basculegion");
    expect(canonicalName("Pelipper", pika)).toBe("Pelipper"); // sin match: queda igual
  });

  it("normaliza las formas estilo Limitless ('<Forma> <Especie>')", () => {
    expect(normalizeLimitlessName("Eternal Flower Floette")).toBe("Floette-Eternal");
    expect(normalizeLimitlessName("Alolan Ninetales")).toBe("Ninetales-Alola");
    expect(normalizeLimitlessName("Hisuian Zoroark")).toBe("Zoroark-Hisui");
    expect(normalizeLimitlessName("Garchomp")).toBe("Garchomp"); // sin prefijo: igual
    // Y encadena con la canonicalización de megas de Pikalytics:
    expect(canonicalName("Eternal Flower Floette", ["Floette-Eternal-Mega", "Garchomp"])).toBe(
      "Floette-Eternal-Mega",
    );
  });
});

describe("PikalyticsLimitlessSource (fetch inyectado)", () => {
  const fetchFn = (async (url: string) => ({
    ok: true,
    text: async () => {
      if (url.includes("/player/") && url.includes("teamlist")) return fx("teamlist.html");
      if (url.includes("/tournaments/limitless/")) return fx("tournament.html");
      return fx("listing.html");
    },
  })) as unknown as typeof fetch;

  const source = new PikalyticsLimitlessSource({ fetchFn, delayMs: 0 });

  it("listRecent devuelve torneos terminados", async () => {
    const tournaments = await source.listRecent();
    expect(tournaments).toHaveLength(2);
    expect(tournaments[0].date).toBe("2026-07-06");
  });

  it("fetchTeams une página de torneo + teamlist y canonicaliza megas", async () => {
    const [tournament] = await source.listRecent();
    const teams = await source.fetchTeams(tournament, { maxPlacement: 1 });

    expect(teams).toHaveLength(1); // maxPlacement=1 filtra al resto
    const team = teams[0];
    expect(team.player).toBe("Altkyle");
    expect(team.wins).toBe(8);
    expect(team.sets).toHaveLength(6);
    // "Dragonite" del teamlist -> "Dragonite-Mega" (nombre canónico de Pikalytics)
    expect(team.sets[0].pokemon).toBe("Dragonite-Mega");
    expect(team.sets[0].set.nature).toBe("Modest");
  });
});
