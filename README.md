# LocalCraft

LocalCraft is a small, local web interface for SimulationCraft. It can parse a pasted profile, run a Docker-backed Quick Sim, and compare equipped gear with compatible detected bag items. Quick Sim presents total DPS, the available error margin, and an ability damage breakdown. The full `json2` document remains available in an expandable debugging section.

## Prerequisites

- Node.js 20 or newer
- Docker Desktop, running locally (required for Quick Sim)

## Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, paste the text copied from the World of Warcraft SimulationCraft addon's `/simc` command, and select **Parse profile**.

To run a Quick Sim, choose its settings and select **Run Quick Sim**. LocalCraft starts `simulationcraftorg/simc:latest` with a temporary mounted working directory and deletes that directory after the run. Override the image with `SIMC_DOCKER_IMAGE`.

To compare gear, parse the profile, open **Gear Compare**, select an equipped slot, select one or more bag alternatives, and choose **Run comparison**. LocalCraft uses SimulationCraft profilesets so the baseline and all candidates are run together. Results are ordered by DPS and include absolute and percentage differences from the current item.

The API runs on `http://127.0.0.1:3001`; its health endpoint is `GET /api/health`.

## Structure

- `frontend/` — React + Vite UI
- `backend/` — Fastify API
- `shared/` — parser and shared domain types

## Profile parsing

The parser deliberately retains every item’s original SimC line as `rawDefinition`. It extracts only UI-oriented details: the player declaration (`class=name`), `spec`, `talents`, supported equipped slot lines, and commented alternate slot lines such as `# head=...`. Unknown fields are ignored safely.

Bag-item conventions vary by addon/export version. The initial parser recognizes the common commented slot-line form; other bag encodings will remain unlisted rather than being guessed or rewritten.

## Checks

```bash
npm run test
npm run build
```
