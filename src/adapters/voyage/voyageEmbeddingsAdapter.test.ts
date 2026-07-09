import { afterEach, describe, expect, it, vi } from "vitest";

import { VoyageEmbeddingsAdapter } from "@/adapters/voyage/voyageEmbeddingsAdapter";

function okResponse(data: { index: number; embedding: number[] }[]) {
  return {
    ok: true,
    json: async () => ({ data }),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VoyageEmbeddingsAdapter (fetch mockeado)", () => {
  it("manda el request correcto y respeta el orden por index", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      // La API puede responder desordenado: el adaptador reordena por index.
      okResponse([
        { index: 1, embedding: [3, 4] },
        { index: 0, embedding: [1, 2] },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new VoyageEmbeddingsAdapter("vk-test");
    const result = await adapter.embedDocuments(["texto a", "texto b"]);

    expect(result).toEqual([
      [1, 2],
      [3, 4],
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.voyageai.com/v1/embeddings");
    expect(init.headers.Authorization).toBe("Bearer vk-test");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("voyage-3.5");
    expect(body.input).toEqual(["texto a", "texto b"]);
    expect(body.input_type).toBe("document");
    expect(body.output_dimension).toBe(1024);
  });

  it("usa input_type=query para consultas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse([{ index: 0, embedding: [1] }]));
    vi.stubGlobal("fetch", fetchMock);

    await new VoyageEmbeddingsAdapter("vk-test").embedQueries(["pregunta"]);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input_type).toBe("query");
  });

  it("trocea en lotes de 128", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const input = JSON.parse(String(init.body)).input as string[];
      return okResponse(input.map((_, i) => ({ index: i, embedding: [i] })));
    });
    vi.stubGlobal("fetch", fetchMock);

    const texts = Array.from({ length: 130 }, (_, i) => `t${i}`);
    const result = await new VoyageEmbeddingsAdapter("vk-test").embedDocuments(texts);

    expect(fetchMock).toHaveBeenCalledTimes(2); // 128 + 2
    expect(result).toHaveLength(130);
  });

  it("lanza con detalle si la API falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "invalid api key",
      } as Response),
    );

    await expect(new VoyageEmbeddingsAdapter("vk-mala").embedQueries(["x"])).rejects.toThrow(
      /Voyage API 401/,
    );
  });

  it("lanza si no hay API key", () => {
    expect(() => new VoyageEmbeddingsAdapter("")).toThrow(/VOYAGE_API_KEY/);
  });
});
