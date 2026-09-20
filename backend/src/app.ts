import cors from "@fastify/cors";
import Fastify from "fastify";
import { parseSimcProfile, type GearCompareRequest, type ParseProfileRequest, type QuickSimRequest } from "@localcraft/shared";
import { DockerSimulationEngine, SimulationEngineError, type SimulationEngine } from "./simulation/docker-engine.js";
import { createGearCompareInput, createQuickSimInput, normalizeSimulationSettings } from "./simulation/input.js";
import { parseGearCompareResult, parseQuickSimResult } from "./simulation/result.js";

export function buildApp(engine: SimulationEngine = new DockerSimulationEngine()) {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post<{ Body: ParseProfileRequest }>("/api/profile/parse", async (request, reply) => {
    if (!request.body?.simcText?.trim()) {
      return reply.code(400).send({ error: "Paste a SimulationCraft profile before parsing." });
    }
    return parseSimcProfile(request.body.simcText);
  });

  app.post<{ Body: QuickSimRequest }>("/api/sim/quick", async (request, reply) => {
    if (!request.body?.simcText?.trim()) {
      return reply.code(400).send({ error: "Paste a SimulationCraft profile before starting a simulation." });
    }

    try {
      const settings = normalizeSimulationSettings(request.body.settings);
      const rawResult = await engine.run(createQuickSimInput(request.body.simcText, settings));
      return { settings, result: parseQuickSimResult(rawResult), rawResult };
    } catch (error) {
      const message = error instanceof SimulationEngineError
        ? error.message
        : error instanceof Error ? error.message : "Simulation could not be started.";
      const technicalDetails = error instanceof SimulationEngineError ? error.technicalDetails : undefined;
      return reply.code(422).send({ error: message, ...(technicalDetails ? { technicalDetails } : {}) });
    }
  });

  app.post<{ Body: GearCompareRequest }>("/api/sim/gear-compare", async (request, reply) => {
    if (!request.body?.simcText?.trim()) return reply.code(400).send({ error: "Paste a SimulationCraft profile before starting a comparison." });
    if (!request.body.candidateItems?.length) return reply.code(400).send({ error: "Select at least one candidate item to compare." });

    try {
      const profile = parseSimcProfile(request.body.simcText);
      const baselineItem = profile.equippedGear.find((item) => item.slot === request.body.slot);
      if (!baselineItem) return reply.code(400).send({ error: "No equipped item was found in the selected slot." });
      const settings = normalizeSimulationSettings(request.body.settings);
      const input = createGearCompareInput(request.body.simcText, request.body.slot, request.body.candidateItems, settings, request.body.adjustments);
      const rawResult = await engine.run(input);
      return { settings, result: parseGearCompareResult(rawResult, baselineItem, request.body.candidateItems), rawResult };
    } catch (error) {
      const message = error instanceof SimulationEngineError ? error.message : error instanceof Error ? error.message : "Comparison could not be started.";
      const technicalDetails = error instanceof SimulationEngineError ? error.technicalDetails : undefined;
      return reply.code(422).send({ error: message, ...(technicalDetails ? { technicalDetails } : {}) });
    }
  });

  return app;
}
