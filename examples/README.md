# ClientAgentJS Examples

This directory contains practical examples demonstrating how to use ClientAgentJS in different scenarios.

## Available Examples

### [Chat Explorer](./browser-basic/)

A full-featured chat interface demonstrating sessions, streaming, event logs, and configuration portability.

**Key features:**
- Multi-turn chat sessions with conversation memory
- Real-time streaming responses with cancellation support
- Markdown rendering of agent responses
- Profile management (OpenAI, Anthropic, Google, Ollama)
- MCP server integration
- Configuration export/import

### [Form Assistance](./form-assistance/)

AI-powered form assistance demonstrating how to add AI help to standard web forms.

**Key features:**
- Attaching AI actions to form fields
- Generating and improving text content
- Using `ask()` and `stream()` as field-level helpers
- Injecting form context into AI requests

### [MCP Tools](./mcp-tools/)

Model Context Protocol integration example showing how to connect the agent to external tools.

**Key features:**
- Configuring and saving MCP servers
- Listing and calling remote tools
- Enabling MCP servers in profiles
- Running AI requests with tool access

## Documentation

For detailed API documentation and architecture information, see:

- [Documentation Index](../docs/README.md)
- [API Reference](../docs/api.md)
- [Architecture Overview](../docs/architecture.md)

---

See license: https://github.com/FranBarInstance/ClientAgentJS
