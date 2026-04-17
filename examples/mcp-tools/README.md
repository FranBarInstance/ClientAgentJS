# MCP Tools Example

Focused browser example for the MCP integration in ClientAgentJS.

## What it demonstrates

- saving an MCP server configuration
- calling `initializeMcp()`
- calling `listMcpTools()`
- calling `callMcpTool()`
- enabling an MCP server in the active profile
- running `ask()` with MCP tools available to the model

## Run

Build the library first:

```bash
npm run build
```

Start the example MCP server:

```bash
cd scripts
python3 mcp_server.py
```

Serve the repository root with a static server and open:

- `examples/mcp-tools/index.html`

Example:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/examples/mcp-tools/`

## Suggested flow

1. Click `Save MCP Server`.
2. Click `Initialize` or `List tools` to verify connectivity.
3. Click `Create Demo Profile` if you have Ollama running at `http://localhost:11434/v1`.
4. Run `ask() with MCP`.

If you are not using Ollama, open the profile panel and create an active OpenAI-compatible profile manually, then enable the saved MCP server in that profile.

---

See license: [ClientAgentJS](https://github.com/FranBarInstance/ClientAgentJS)
