import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

export type RawSimulationResult = Record<string, unknown>;

export interface SimulationEngine {
  run(input: string): Promise<RawSimulationResult>;
}

export class SimulationEngineError extends Error {
  constructor(message: string, readonly technicalDetails?: string) {
    super(message);
    this.name = "SimulationEngineError";
  }
}

interface ProcessResult { exitCode: number; stdout: string; stderr: string; }
type ProcessRunner = (command: string, args: string[]) => Promise<ProcessResult>;

const runProcess: ProcessRunner = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
  child.on("error", reject);
  child.on("close", (exitCode) => resolve({ exitCode: exitCode ?? 1, stdout, stderr }));
});

export class DockerSimulationEngine implements SimulationEngine {
  private readonly image: string;

  constructor(image = process.env.SIMC_DOCKER_IMAGE ?? "simulationcraftorg/simc:latest", private readonly processRunner: ProcessRunner = runProcess) {
    this.image = image;
  }

  async run(input: string): Promise<RawSimulationResult> {
    const directory = await mkdtemp(join(tmpdir(), "localcraft-sim-"));
    try {
      await writeFile(join(directory, "input.simc"), input, "utf8");
      let processResult: ProcessResult;
      try {
        processResult = await this.processRunner("docker", [
          "run", "--rm", "--mount", `type=bind,source=${directory},target=/work`,
          this.image, "/work/input.simc",
        ]);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          throw new SimulationEngineError("Docker could not be started. Make sure Docker Desktop is installed and running.");
        }
        throw new SimulationEngineError("Docker could not be started.", error instanceof Error ? error.message : undefined);
      }

      if (processResult.exitCode !== 0) {
        const details = [processResult.stderr, processResult.stdout].filter(Boolean).join("\n").slice(0, 12_000);
        throw new SimulationEngineError("SimulationCraft rejected this profile or could not run the selected image.", details || undefined);
      }

      let output: string;
      try {
        output = await readFile(join(directory, "result.json"), "utf8");
      } catch {
        throw new SimulationEngineError("SimulationCraft finished without producing JSON output.", processResult.stderr.slice(0, 12_000) || undefined);
      }

      try {
        const parsed: unknown = JSON.parse(output);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object.");
        return parsed as RawSimulationResult;
      } catch (error) {
        throw new SimulationEngineError("SimulationCraft produced invalid JSON output.", error instanceof Error ? error.message : undefined);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
