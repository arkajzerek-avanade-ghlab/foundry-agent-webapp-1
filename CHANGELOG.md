# Changelog

All notable changes to the **AI Agent Web App** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [1.0.0] — 2026-04-21

### Added
- **GA Azure AI SDK migration** — updated to the GA release of `Azure.AI.Projects` and `Azure.AI.Extensions.OpenAI`; removed all preview-only API paths
- **.NET 10** — upgraded runtime and SDK targets from .NET 9 to .NET 10
- **File cleanup** — automatic cleanup of uploaded agent files after sessions end
- **Multi-layer setup detection** — detects missing prerequisites at multiple points during `azd up` and local dev startup, with clear remediation instructions
- **GitHub Codespaces support** — devcontainer includes `azd` CLI, .NET 10 SDK, Node.js, and PowerShell; all tools pre-installed for zero-friction onboarding
- **Message queue during streaming** — user messages sent while the assistant is responding are queued and replayed once the stream completes
- **Stream retry with message recovery** — interrupted SSE streams automatically retry; partial messages are recovered without losing context
- **Message actions** — copy, regenerate, and quote actions on individual chat messages
- **Tool-use visualization** — displays Foundry agent tool calls (MCP, OpenAPI, Logic Apps) inline in the chat thread
- **File download** — assistant-generated files are available for download directly from the chat UI
- **Accessibility improvements** — ARIA labels, keyboard navigation, and focus management for chat components
- **Portal compatibility** (`AZURE_EXISTING_*` variables) — users arriving from the AI Foundry portal can supply pre-existing resource variables instead of letting `azd` create them
- **OBO (On-Behalf-Of) authentication** — `OnBehalfOfCredential` strategy allows the backend to call Azure AI on behalf of the signed-in user; mutually exclusive with Managed Identity via `ENTRA_BACKEND_CLIENT_ID`
- **MCP tool approval flow** — frontend prompts for user confirmation before executing Model Context Protocol tool calls
- **Observability** — Application Insights for both frontend (`@microsoft/applicationinsights-web`) and backend (`Azure.Monitor.OpenTelemetry.AspNetCore`); sharing one Log Analytics workspace
- **Security hardening** — JWT Bearer validation tightened; audience and issuer pinned to Entra app registration
- **Inline citation markers** — assistant responses show `[1]`-style citation markers that scroll to the matching source reference
- **Annotations support** — renders Foundry annotation objects (file paths, URLs) attached to assistant messages
- **Custom agent system** — per-project Copilot agent definitions with workflow handoffs between specialized agents
- **SDK Research and Test agents** — Copilot agents for researching `Azure.AI.Projects` SDK surface and running backend tests
- **Skills-based architecture** — repository instructions migrated from `AGENTS.md` to `.github/skills/` directory for modular, composable guidance
- **Bicep Entra app registration** — Microsoft Entra app registration created declaratively in Bicep via the Graph extension; redirect URIs and FIC set in `postprovision.ps1` due to Graph replication constraints
- **Pre-commit hooks** — commit gate, doc-sync reminder, and test reminder hooks via `.github/hooks/`
- **Cross-platform improvements** — PowerShell hooks and scripts work on Windows, macOS, and Linux

### Changed
- Credential strategy simplified: `ManagedIdentityCredential` (user-assigned MI) and `OnBehalfOfCredential` are now mutually exclusive, selected by the presence of `ENTRA_BACKEND_CLIENT_ID`
- Deployment hooks migrated from custom workflow to `azd` lifecycle hooks (`predeploy`, `postprovision`, `postdown`)
- Frontend dependency installation automated — `npm install` runs automatically on first `npm run dev`

### Fixed
- Multi-resource AI Foundry selection — improved disambiguation when a subscription has multiple Cognitive Services accounts
- Hook logging — hooks now write structured logs for easier troubleshooting
- `yjs` peer dependency added to resolve ACR build failures
- `postdown` hook stops transcript before deleting the environment folder, preventing a race condition

---

## [0.1.0] — 2025-12-05

### Added
- Initial project scaffolding: ASP.NET Core 9 backend + React 19 + Vite frontend in a single Container App
- `azd up` single-command deployment to Azure Container Apps (~10–12 min)
- Entra ID authentication via MSAL.js on the frontend; JWT Bearer validation on the backend
- Real-time SSE (Server-Sent Events) streaming chat
- Azure AI Foundry Agent Service integration using `Azure.AI.Projects` (preview)
- `AzureCliCredential` / `AzureDeveloperCliCredential` chained for local development
- Bicep infrastructure: Azure Container Registry, Container Apps environment, user-assigned Managed Identity
- `.devcontainer` for GitHub Codespaces with basic tool pre-installation

---

[Unreleased]: https://github.com/arkajzerek-avanade-ghlab/foundry-agent-webapp-1/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/arkajzerek-avanade-ghlab/foundry-agent-webapp-1/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/arkajzerek-avanade-ghlab/foundry-agent-webapp-1/releases/tag/v0.1.0
