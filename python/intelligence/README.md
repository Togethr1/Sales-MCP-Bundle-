# heuristic scoring and resolution

Python subsystem for heuristic scoring, resolution, and ranking logic that sits behind the TypeScript MCP orchestration layer.

Planned responsibilities:

- entity resolution across provider records
- account and deal health scoring
- signal ranking
- recommendation support inputs

The current implementation exposes a FastAPI contract for deterministic local development and heuristic integration tests.
