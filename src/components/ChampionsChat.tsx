"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { MetaTopCard } from "@/components/MetaTopCard";
import { PartySidebar } from "@/components/PartySidebar";
import { PixelSprite } from "@/components/PixelSprite";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SideNav } from "@/components/SideNav";
import { UsageCard } from "@/components/UsageCard";
import {
  addHistoryEntry,
  clearHistoryEntries,
  formatWhen,
  getHistorySnapshot,
  getServerHistorySnapshot,
  newEntry,
  subscribeHistory,
  type TeamAnalysis,
} from "@/components/history";
import { recommendationToShowdown } from "@/components/showdown";
import { toID } from "@/core/domain/ids";
import type { Recommendation, ThreatMon } from "@/core/domain/model";

interface Props {
  regulation: string;
  legalMons: string[];
  threats: ThreatMon[];
}

/** Un mensaje del chat: texto plano o una "tarjeta" con datos reales. */
interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text?: string;
  recommendations?: Recommendation[];
  meta?: ThreatMon[];
  usage?: ThreatMon;
}

const ASSISTANT_NAME = "Rotom-Dex";

/**
 * Chat del asistente + party sidebar. Hoy las respuestas salen del motor
 * determinista (usage real de torneos + recomendaciones verificadas por el
 * motor de daño); en la Fase 6 el AdvisorPort (Claude) tomará el texto libre
 * sin cambiar esta UI.
 */
export function ChampionsChat({ regulation, legalMons, threats }: Props) {
  const [team, setTeam] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      text: `¡Bzzt! Soy ${ASSISTANT_NAME}, tu asistente de la Reg. ${regulation}. ¿Por dónde partimos?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  // Historial en localStorage vía store externo (SSR: vacío; cliente: hidrata).
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot,
  );
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function push(msg: Omit<ChatMessage, "id">) {
    setMessages((current) => [...current, { ...msg, id: nextId.current++ }]);
  }

  async function analyze() {
    if (team.length === 0 || loading) return;
    push({ role: "user", text: `Analiza mi equipo: ${team.join(", ")}.` });
    setLoading(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team, regulation }),
      });
      const data = (await res.json()) as { recommendations?: Recommendation[]; error?: string };
      if (!res.ok || !data.recommendations) throw new Error(data.error ?? `Error ${res.status}`);
      push({
        role: "assistant",
        text:
          `¡Zzzt-listo! Aquí va el set de ${data.recommendations.length === 1 ? "tu Pokémon" : `tus ${data.recommendations.length} Pokémon`}, ` +
          `con benchmarks contra el top del meta. Los ✓ los verificó el motor de daño.`,
        recommendations: data.recommendations,
      });
      // Guardar en el historial (izquierda), persistido en el navegador.
      addHistoryEntry(newEntry(team, data.recommendations));
    } catch (err) {
      push({
        role: "assistant",
        text: `Bzzt… algo falló: ${err instanceof Error ? err.message : "error inesperado"}.`,
      });
    } finally {
      setLoading(false);
    }
  }

  /** Respuestas deterministas a texto libre (la IA fina llega en la Fase 6). */
  function answer(raw: string) {
    const text = toID(raw);

    // ¿Menciona un Pokémon del roster? (el match más largo gana: "charizardmegay" > "charizard")
    const mentioned = legalMons
      .filter((m) => text.includes(toID(m)))
      .sort((a, b) => toID(b).length - toID(a).length)[0];

    const wantsTeam = /analiz|recomiend|recomend|equipo|spread|evs/.test(text);
    const wantsMeta = /meta|amenaza|top|uso|usage|tier/.test(text);

    if (wantsTeam && team.length > 0) return void analyze();

    if (mentioned) {
      const threat = threats.find((t) => toID(t.pokemon) === toID(mentioned));
      if (threat) {
        return push({
          role: "assistant",
          text: `Datos de torneos de ${threat.pokemon}:`,
          usage: threat,
        });
      }
      return push({
        role: "assistant",
        text:
          `${mentioned} es legal en la Reg. ${regulation}, pero no aparece en el top de uso de ` +
          `los últimos torneos, así que no tengo ficha de datos. Añádelo a tu equipo y pulsa ` +
          `«Analizar equipo»: te derivo un set desde sus stats base igualmente.`,
      });
    }

    if (wantsTeam) {
      return push({
        role: "assistant",
        text: "Primero llena alguna casilla del equipo (a la derecha) y te lo analizo al tiro.",
      });
    }

    if (wantsMeta) {
      return push({
        role: "assistant",
        text: "El top de uso ahora mismo, con datos reales de torneos:",
        meta: threats,
      });
    }

    if (/hola|buenas|hey|holi/.test(text)) {
      return push({
        role: "assistant",
        text: "¡Bzzt! Hola. Arma tu equipo a la derecha, o pregúntame por el meta o por un Pokémon.",
      });
    }

    return push({
      role: "assistant",
      text:
        "Zzzt… esa aún no la proceso: mi cerebro conversacional (IA) se conecta en la Fase 6. " +
        "Hoy puedo: analizar tu equipo, mostrarte el top del meta, o la ficha de un Pokémon " +
        "(escribe su nombre).",
    });
  }

  function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (text === "" || loading) return;
    setInput("");
    push({ role: "user", text });
    answer(text);
  }

  async function copyTeam(recs: Recommendation[]) {
    await navigator.clipboard.writeText(recs.map(recommendationToShowdown).join("\n\n"));
  }

  /** Recupera un análisis del historial: restaura el equipo y lo re-muestra. */
  function restore(entry: TeamAnalysis) {
    if (loading) return;
    setTeam(entry.team.slice(0, 6));
    push({
      role: "assistant",
      text: `Bzzt: del historial (${formatWhen(entry.at)}). Restauré el equipo en las casillas.`,
      recommendations: entry.recommendations,
    });
  }

  function clearHistory() {
    clearHistoryEntries();
  }

  // La guía de bienvenida se oculta en cuanto el usuario escribe algo.
  const hasUserMessage = messages.some((m) => m.role === "user");

  const chips = [
    { label: "Top del meta", send: "¿Cómo está el meta?" },
    ...(threats[0] ? [{ label: `Ficha de ${threats[0].pokemon}`, send: threats[0].pokemon }] : []),
    ...(team.length > 0 ? [{ label: "Analizar equipo", send: "Analiza mi equipo" }] : []),
  ];

  return (
    <div className="flex flex-col gap-6 lg:h-full lg:min-h-0 lg:flex-row">
      <SideNav
        open={navOpen}
        onToggle={() => setNavOpen((v) => !v)}
        history={history}
        disabled={loading}
        canAnalyze={team.length > 0}
        onSelectEntry={restore}
        onClearHistory={clearHistory}
        onAnalyze={analyze}
        onMeta={() => send("¿Cómo está el meta?")}
      />

      {/* Chat: en escritorio llena el alto disponible y solo él scrollea */}
      <section className="game-box order-1 flex min-w-0 flex-1 flex-col lg:order-none lg:min-h-0">
        <header className="flex items-center gap-2 border-b-2 border-ink px-4 py-2.5">
          <PixelSprite pokemon="Rotom" size={28} />
          <span className="font-pixel text-[10px] uppercase">{ASSISTANT_NAME}</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-poke-green" />
            meta vivo
          </span>
        </header>

        <div
          ref={scrollRef}
          className="flex h-[480px] flex-col gap-4 overflow-y-auto p-4 lg:h-auto lg:min-h-0 lg:flex-1"
        >
          {!hasUserMessage && (
            <div className="game-inset bg-panel p-3.5 text-sm leading-relaxed text-muted">
              <p className="font-pixel mb-2 text-[9px] text-ink uppercase">¿Para qué sirve?</p>
              <p>
                Arma tu equipo (hasta 6) en las casillas de la derecha y pide el análisis: recibes
                spreads de EVs, ítems y movimientos contra el meta real de torneos — cada número lo
                verifica el motor de daño, nunca se inventa. También puedes pedir el top del meta o
                la ficha de cualquier Pokémon escribiendo su nombre.
              </p>
            </div>
          )}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <p className="game-inset max-w-[85%] bg-poke-blue px-3 py-2 text-sm text-white">
                  {msg.text}
                </p>
              </div>
            ) : (
              <div key={msg.id} className="flex max-w-[95%] items-start gap-2.5">
                <PixelSprite pokemon="Rotom" size={36} className="mt-1 shrink-0" />
                <div className="min-w-0 flex-1 space-y-3">
                  {msg.text && (
                    <p className="game-inset bg-panel px-3 py-2 text-sm leading-relaxed">
                      {msg.text}
                    </p>
                  )}
                  {msg.meta && (
                    <div className="game-inset bg-panel p-3">
                      <MetaTopCard threats={msg.meta} />
                    </div>
                  )}
                  {msg.usage && (
                    <div className="game-inset bg-panel p-3">
                      <UsageCard threat={msg.usage} />
                    </div>
                  )}
                  {msg.recommendations && (
                    <div className="space-y-3">
                      <div className="grid gap-3 xl:grid-cols-2">
                        {msg.recommendations.map((rec) => (
                          <RecommendationCard key={rec.pokemon} recommendation={rec} />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyTeam(msg.recommendations!)}
                        className="game-btn font-pixel bg-panel-2 px-3 py-2 text-[9px] uppercase"
                      >
                        Copiar equipo (Showdown)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {loading && (
            <div className="flex items-center gap-2.5">
              <PixelSprite pokemon="Rotom" size={36} className="shrink-0" />
              <p className="game-inset bg-panel px-3 py-2 text-sm" aria-label="Calculando">
                <span className="typing-dot">●</span> <span className="typing-dot">●</span>{" "}
                <span className="typing-dot">●</span>
              </p>
            </div>
          )}
        </div>

        {/* Chips + input */}
        <div className="border-t-2 border-ink p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => send(chip.send)}
                disabled={loading}
                className="game-btn bg-panel-2 px-2.5 py-1 text-xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta por el meta, un Pokémon, o pide el análisis…"
              className="game-inset min-w-0 flex-1 px-3 py-2.5 text-sm outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={loading || input.trim() === ""}
              className="game-btn font-pixel shrink-0 bg-poke-yellow px-4 text-[10px] text-ink uppercase"
            >
              Enviar
            </button>
          </form>
        </div>
      </section>

      <PartySidebar
        legalMons={legalMons}
        team={team}
        disabled={loading}
        onAdd={(mon) => setTeam((t) => (t.length < 6 && !t.includes(mon) ? [...t, mon] : t))}
        onRemove={(mon) => setTeam((t) => t.filter((m) => m !== mon))}
        onAnalyze={analyze}
      />
    </div>
  );
}
