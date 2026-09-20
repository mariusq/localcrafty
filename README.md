# LocalCraft

LocalCraft is a small, local web interface for SimulationCraft. This first increment implements profile parsing only; it does **not** produce simulated DPS yet.

## Prerequisites

- Node.js 20 or newer
- Docker Desktop (required by the upcoming SimulationCraft phase, not by profile parsing)

## Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, paste the text copied from the World of Warcraft SimulationCraft addon's `/simc` command, and select **Parse profile**.

The API runs on `http://127.0.0.1:3001`; its health endpoint is `GET /api/health`.

## Structure

- `frontend/` — React + Vite UI
- `backend/` — Fastify API
- `shared/` — parser and shared domain types

## Profile parsing

The parser deliberately retains every item’s original SimC line as `rawDefinition`. It extracts only UI-oriented details: the player declaration (`class=name`), `spec`, `talents`, supported equipped slot lines, and commented alternate slot lines such as `# head=...`. Unknown fields are ignored safely.

Bag-item conventions vary by addon/export version. The initial parser recognizes the common commented slot-line form; other bag encodings will remain unlisted rather than being guessed or rewritten.

## Next steps before a simulation

The remaining work is Docker-backed SimulationCraft execution, `json2` result parsing, Quick Sim UI, and gear comparison profilesets. The planned default image is `simulationcraftorg/simc:latest`, configurable later through `SIMC_DOCKER_IMAGE`.

## Checks

```bash
npm run test
npm run build
```
