# Documentation

Welcome to the ClientAgentJS documentation. This library is designed to add AI agent capabilities to your web applications with a Zero-Backend approach.

## Core Documentation

- [**API Contract**](api.md): Detailed reference for `createAgent`, sessions, profiles, and MCP management.
- [**Architecture Overview**](architecture.md): Learn how the library handles storage, provider adapters, and the event system.

## Integration Features

- **Global Variable Support**: You can use `ClientAgent` as a global object if you include `dist/clientagentjs.global.js` via a `<script>` tag.
- **Robust Networking**: Includes automatic retries for network errors and 429/5xx status codes.
- **Improved Debugging**: Error messages now include full details from AI providers.

## Practical Examples

Explore these examples to learn how to integrate ClientAgentJS into different scenarios:

### [Chat Explorer](../examples/browser-basic/)
**The flagship example.** A professional chat interface that includes session management, streaming cancellation, Markdown rendering, and real-time event logging.

### [Form Assistance](../examples/form-assistance/)
**AI-powered forms.** Demonstrates how to add AI help to standard text fields for content improvement and generation based on form context.

### [MCP Tools](../examples/mcp-tools/)
**Model Context Protocol.** A technical example on connecting the agent to external MCP servers to access databases or local files.

---

### How to run the examples
To test any example locally:
1. Build the library: `npm run build`
2. Serve the project root with a static server (e.g., `npx serve` or `python3 -m http.server`)
3. Open the example path in your browser.

---

See license: [ClientAgentJS](https://github.com/FranBarInstance/ClientAgentJS)
