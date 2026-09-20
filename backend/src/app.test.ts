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
  const app = buildApp({ run: async (input) => { receivedInput = input; return { sim: { players: [{ collected_data: { dps: { mean: 100 } } }] } }; } });
  const response = await app.inject({
    method: "POST",
    url: "/api/sim/quick",
    payload: { simcText: "mage=Khadgar\nspec=fire", settings: { iterations: 250 } },
  });

  assert.equal(response.statusCode, 200);
  assert.match(receivedInput, /mage=Khadgar/);
  assert.match(receivedInput, /iterations=250/);
  assert.equal(response.json().result.dps, 100);
  await app.close();
});

test("gear comparison sends one profileset run and returns differences", async () => {
  let receivedInput = "";
  const app = buildApp({ run: async (input) => {
    receivedInput = input;
    return { sim: { players: [
      { collected_data: { dps: { mean: 100 } } },
      { collected_data: { dps: { mean: 115 } } },
    ] } };
  } });
  const response = await app.inject({ method: "POST", url: "/api/sim/gear-compare", payload: {
    simcText: "mage=Khadgar\nhead=old,id=1",
    slot: "head", candidateItems: [{ slot: "head", rawDefinition: "head=new,id=2" }],
  } });
  assert.equal(response.statusCode, 200);
  assert.match(receivedInput, /profileset\."LocalCraft Candidate 1"/);
  assert.equal(response.json().result.candidates[0].difference, 15);
  await app.close();
});
