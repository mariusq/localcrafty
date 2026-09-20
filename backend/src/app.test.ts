import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "./app.js";

test("health endpoint responds", async () => {
  const app = buildApp();
  const response = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok" });
  await app.close();
});

test("quick sim sends generated SimC input to the simulation engine", async () => {
  let receivedInput = "";
  const app = buildApp({ run: async (input) => { receivedInput = input; return { simulationcraft: { version: "test" } }; } });
  const response = await app.inject({
    method: "POST",
    url: "/api/sim/quick",
    payload: { simcText: "mage=Khadgar\nspec=fire", settings: { iterations: 250 } },
  });

  assert.equal(response.statusCode, 200);
  assert.match(receivedInput, /mage=Khadgar/);
  assert.match(receivedInput, /iterations=250/);
  assert.deepEqual(response.json().rawResult, { simulationcraft: { version: "test" } });
  await app.close();
});
