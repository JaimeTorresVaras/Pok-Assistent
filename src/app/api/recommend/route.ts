import { getContainer } from "@/composition/container";
import { toID } from "@/core/domain/ids";
import { IllegalTeamError } from "@/core/usecases/recommendTeam";

/**
 * POST /api/recommend — adaptador de entrada HTTP del caso de uso
 * RecommendTeam. Body: { team: string[], regulation?: string }.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
  }

  const { team, regulation = "M-B" } = (body ?? {}) as { team?: unknown; regulation?: unknown };

  if (typeof regulation !== "string" || regulation.trim() === "") {
    return Response.json({ error: "`regulation` debe ser un string." }, { status: 400 });
  }
  if (
    !Array.isArray(team) ||
    team.length < 1 ||
    team.length > 6 ||
    !team.every((m): m is string => typeof m === "string" && m.trim() !== "")
  ) {
    return Response.json(
      { error: "`team` debe ser una lista de 1 a 6 nombres de Pokémon." },
      { status: 400 },
    );
  }

  const names = team.map((m) => m.trim());
  if (new Set(names.map(toID)).size !== names.length) {
    return Response.json(
      { error: "El equipo tiene Pokémon repetidos (Species Clause)." },
      { status: 400 },
    );
  }

  const container = getContainer();
  if (!container.regulations.isSupported(regulation)) {
    return Response.json({ error: `Regulación sin datos: ${regulation}.` }, { status: 400 });
  }

  try {
    const recommendations = await container.recommendTeam.exec(names, regulation);
    return Response.json({ recommendations });
  } catch (error) {
    if (error instanceof IllegalTeamError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/recommend:", error);
    return Response.json({ error: "Error interno generando recomendaciones." }, { status: 500 });
  }
}
