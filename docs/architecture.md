# Architecture

ClientAgentJS is organized as a small browser-first runtime with separated responsibilities.

## Public entry point

- `src/index.js`

Exports only `createAgent`.

## Agent layer

- `src/agent/createAgent.js`
- `src/agent/createSession.js`

Responsibilities:

- build the public agent facade
- coordinate providers, storage, transport, tools and MCP
- expose `ask()`, `stream()`, session creation and configuration methods

## Providers

- `src/providers/openai.js`
- `src/providers/anthropic.js`
- `src/providers/google.js`
- `src/providers/index.js`

Responsibilities:

- translate the normalized agent request into provider-specific HTTP payloads
- normalize provider responses into the public `{ text, raw }` and chunk contracts
- handle provider-specific streaming and tool-calling flows

> **⚠️ Security Warning (Anthropic):** The Anthropic provider uses the `anthropic-dangerous-direct-browser-access` header to bypass CORS limitations. This means the API Key is exposed directly to the client browser. This fits the "Zero-Backend" direct deployment model, but you must ensure you have proper billing limits, or only use this model for personal projects / BYOK (Bring Your Own Key) scenarios.

## Memory and storage

- `src/memory/conversationMemory.js`
- `src/storage/profileStorage.js`
- `src/storage/mcpStorage.js`
- `src/storage/adapters/localStorage.js`
- `src/storage/adapters/sessionStorage.js`

Responsibilities:

- keep session conversation history in memory (`src/memory`)
- persist profiles and MCP server configurations in browser storage (`src/storage`)
- sanitize corrupted persisted data into a valid runtime state

## Transport

- `src/transport/fetchClient.js`

Responsibilities:

- perform JSON requests
- stream SSE payloads
- compose timeouts with `AbortSignal`

## Tools

- `src/tools/registry.js`

Responsibilities:

- register local tool handlers
- execute local tools by name
- expose the local tool list to providers that support tool-calling

**Design boundary:** Local tools are strictly for simple, dependency-free frontend interactions. For advanced capabilities or interactions with external services, use MCP servers instead.

## MCP

- `src/mcp/client.js`
- `src/mcp/registry.js`

Responsibilities:

- store and retrieve MCP server configuration references
- issue JSON-RPC requests to MCP servers
- list and call MCP tools

## Optional UI

- `src/ui/profilePanel.js`

Responsibilities:

- provide a built-in browser configuration panel for profiles and MCP servers
- use only the public agent API
- support basic i18n based on `<html lang>`

**Styling Strategy:**

The UI modules include a `FALLBACK_CSS` constant that is injected into the document head when the panel opens. To ensure these styles are easily overridable by the host application, all built-in rules use the `:where()` CSS pseudo-class, which reduces their specificity to zero. Developers can provide their own styles by targeting the same classes (e.g., `.client-agent-js-profile-dlg`) without needing to use `!important` or high-specificity selectors.

## Distribution

- `scripts/build.mjs`
- `dist/clientagentjs.esm.js`
- `dist/clientagentjs.esm.min.js`

Responsibilities:

- build distributable ESM bundles from `src/`
- keep examples pointed at the built runtime rather than internal source files
