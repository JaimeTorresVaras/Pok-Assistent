"use client";

import { useState } from "react";

import { Sprites } from "@pkmn/img";

/**
 * Sprite pixel art (gen 5, CDN de Pokémon Showdown) de una especie.
 * Para especies que Showdown no conoce (p. ej. megas exclusivas de
 * Champions) se intenta la especie base y, si tampoco, una Pokéball.
 */
export function spriteUrl(pokemon: string): string {
  return Sprites.getDexPokemon(pokemon, { gen: "gen5" }).url;
}

interface Props {
  pokemon: string;
  /** Lado del cuadrado en px (el sprite gen 5 nativo es 96×96). */
  size?: number;
  className?: string;
}

export function PixelSprite({ pokemon, size = 64, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Fallback: Pokéball dibujada inline (no depende de la red).
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-label={pokemon}
        role="img"
      >
        <circle cx="12" cy="12" r="9" fill="var(--panel-2)" stroke="var(--ink)" strokeWidth="2" />
        <path d="M3 12h18" stroke="var(--ink)" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" fill="var(--panel)" stroke="var(--ink)" strokeWidth="2" />
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- sprites remotos de Showdown, sin optimizador
    <img
      src={spriteUrl(pokemon)}
      alt={pokemon}
      width={size}
      height={size}
      loading="lazy"
      className={`pixelated select-none ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
