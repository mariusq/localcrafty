import cors from "@fastify/cors";
import Fastify from "fastify";
import { parseSimcProfile, type ParseProfileRequest } from "@localcraft/shared";

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post<{ Body: ParseProfileRequest }>("/api/profile/parse", async (request, reply) => {
    if (!request.body?.simcText?.trim()) {
      return reply.code(400).send({ error: "Paste a SimulationCraft profile before parsing." });
    }
    return parseSimcProfile(request.body.simcText);
  });

  return app;
}
