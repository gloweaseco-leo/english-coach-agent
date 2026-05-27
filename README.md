# English Coach Agent

[简体中文](README.zh-CN.md) | English

Local English learning coach based on
[`byoungd/English-level-up-tips`](https://github.com/byoungd/English-level-up-tips).

**v0.3 RAG Coach**: optional LLM providers + lightweight chapter retrieval for grounded chat with references.

## Attribution And License Notice

CC BY-NC 4.0 — non-commercial learning tool only. Do not use for commercial products, paid courses, SaaS, or resale without permission from the original rights holder, or replace with your own licensed content.

## Quick Start

### Local mode (default, no API key)

```powershell
npm start
```

### OpenAI-compatible

```powershell
$env:COACH_MODE="openai"
$env:OPENAI_COMPATIBLE_BASE_URL="https://api.openai.com/v1"
$env:OPENAI_COMPATIBLE_API_KEY="your-key-here"
$env:OPENAI_COMPATIBLE_MODEL="gpt-4o-mini"
npm start
```

### Ollama (optional)

```powershell
$env:COACH_MODE="ollama"
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="qwen2.5:7b"
npm start
```

| Variable | Default | Description |
|----------|---------|-------------|
| `COACH_MODE` | `local` | `local` / `openai` / `ollama` |
| `LLM_TIMEOUT_MS` | `20000` | LLM timeout (ms) |
| `RAG_TOP_K` | `5` | Retrieval top K |

API keys are read from environment variables only — never exposed to the frontend.

On missing config or LLM failure, the app falls back to local rule-based coaching.

## v0.3 Features

- Provider abstraction: Local Rule / OpenAI-compatible / Ollama
- Lightweight RAG: heading-based chunks + keyword scoring (not embedding/vector DB)
- Grounded chat with `[1][2]` references, profile, and today’s task
- `GET /api/search?q=...`
- v0.2 learning loop fully preserved

## API

```text
GET  /api/health
GET  /api/search?q=listening
GET  /api/state
POST /api/chat
... (all v0.2 endpoints)
```

## Tests

```bash
npm test
```

## Data reset

Delete `.data/learning-state.json` (or `.data/`) while the server is stopped.

## Notes

Default mode requires no external AI. LLM is optional. RAG is local keyword retrieval, not a vector database.
