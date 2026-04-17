# ClientAgentJS

![ClientAgentJS](https://repository-images.githubusercontent.com/1213823045/78ba94f8-639a-48d6-97f4-0cdba491a37b)

ClientAgentJS is a plain JavaScript browser library for adding AI agent capabilities to web applications without building your own backend.

ClientAgentJS uses a **Zero-Backend Architecture**. Unlike traditional AI applications that proxy requests through a server, this library runs entirely in the browser. It follows a **Direct Client-to-Provider** model where the user's credentials never leave their device and requests go directly from the browser to the AI provider.

## Use Cases

- **User Form Assistance**: Enhance public-facing web forms with AI capabilities for text generation, translation, or content improvement—helping end users fill out profiles, reviews, or applications without changing your backend.
- **Admin & Editor Form Assistance**: Restrict AI-powered form assistance to internal users, administrators, or content editors. Streamline product descriptions, service listings, CRM entries, and internal tool workflows while maintaining control over who accesses the AI features.
- **Internal & Productivity Tools**: Build tools for teams that already have their own AI keys, avoiding infrastructure costs and privacy concerns.
- **Contextual Web Assistants**: Create agents that read the current page content or user selection to provide summaries or answer questions.
- **Creative Editors**: Integrate AI help directly into writing tools, CMS editors, or image generators where the user controls their own consumption.
- **Rapid Prototyping**: Validate AI-powered ideas in minutes without setting up any server-side environment.
- **Multi-Provider Apps**: Allow users to choose between OpenAI, Anthropic, or local models (via Ollama) within the same interface.

### Live Examples

Try the interactive examples online:

- [Chat Explorer](https://franbarinstance.github.io/ClientAgentJS/examples/browser-basic/) - Full-featured chat interface
- [Form Assistance](https://franbarinstance.github.io/ClientAgentJS/examples/form-assistance/) - AI-powered form helpers
- [MCP Tools](https://franbarinstance.github.io/ClientAgentJS/examples/mcp-tools/) - Model Context Protocol integration

## Key Features

- **Zero-Backend**: No proxy servers, no hidden costs. Your browser talks directly to the AI provider.
- **Multi-Provider**: Native support for OpenAI, Anthropic (Claude), and Google (Gemini).
- **Automatic Retries**: Built-in resilience against transient network errors and rate limiting (429) with exponential backoff.
- **Detailed Error Reporting**: Captures and displays descriptive error messages directly from the AI providers to simplify debugging.
- **Global Distribution**: Available as both ESM modules and a global `ClientAgent` object for classic web environments.
- **MCP Compatible**: Connect your agent to the vast ecosystem of Model Context Protocol tools and servers.
- **Privacy First**: API keys and conversation history stay in your browser's local/session storage.

## Model Context Protocol (MCP)

ClientAgentJS supports the **Model Context Protocol**, allowing agents to use external tools and data sources.

- **External Tools**: Connect to any MCP server that supports the `streamable-http` transport (or compatible SSE/JSON-RPC over HTTP).
- **The CORS Challenge**: Since the library runs entirely in the browser, external MCP servers must support **CORS** (Cross-Origin Resource Sharing).
- **Hosting Options**:
  - **Local Servers**: Users can run MCP servers on their own machines (localhost) to interact with local files or databases.
  - **Provider Servers**: Application developers can host and provide their own MCP servers pre-configured for their users.
  - **Shared Servers**: Reuse the same MCP configuration across different profiles and sessions.

For more details on implementing or connecting to MCP servers, see the [MCP Tools example](examples/mcp-tools/).

## What it does not require

- no backend owned by the application developer
- no framework
- no Node.js at runtime
- no bundler to consume the distributed library

## What it provides

- `createAgent()` with no required arguments
- profile storage in `sessionStorage` or `localStorage`
- `ask()` for one-shot requests
- `stream()` for streaming responses
- `createSession()` for multi-turn conversations
- provider adapters for OpenAI-compatible, Anthropic-native and Google-native profiles
- optional MCP server configuration per profile
- optional local tool registration
- a browser configuration panel for profiles and MCP servers

## Development

Build the distributable files:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Getting Started

### Installation

Since the project is not yet published on npm, use the pre-built files from the `dist/` folder:

**ESM (recommended for modern projects):**
```javascript
import { createAgent } from './dist/clientagentjs.esm.js';
```

**Global script (for classic web environments):**
```html
<script src="dist/clientagentjs.global.js"></script>
<script>
  // Access via the global variable ClientAgent
  const agent = ClientAgent.createAgent({
    storageKey: "my-app-unique-key"
  });
</script>
```

### Basic Usage

```javascript
import { createAgent } from './dist/clientagentjs.esm.js';

const agent = createAgent();

// Check if a profile is configured
if (!agent.isReady()) {
  agent.openConfigPanel();
}

// Simple request
const response = await agent.ask("Hello, who are you?");
console.log(response.text);

// Streaming request
for await (const chunk of agent.stream("Tell me a story")) {
  process.stdout.write(chunk.delta);
}
```

## Streaming

```js
const controller = new AbortController()

for await (const chunk of agent.stream("Write a headline", {
  signal: controller.signal
})) {
  console.log(chunk.text)
}
```

## Sessions

```js
const session = agent.createSession()

await session.ask("Who won the previous round?")
await session.ask("Now summarize it in one sentence.")
```

## Profiles and import/export

Profiles store provider, model, credentials, prompt defaults and related options. MCP server configuration is stored separately and referenced from profiles.

```js
const backup = agent.exportProfiles()
agent.importProfiles(backup)
```

Calling `importProfiles()` always shows a confirmation warning before replacing the current profiles and MCP configuration.

## Local tools

The agent can register developer-defined tools that run in the browser and can be used automatically by compatible providers.

```js
agent.registerTool("calculate_sum", ({ numbers }) => {
  return {
    total: numbers.reduce((acc, value) => acc + Number(value || 0), 0)
  }
})
```

Public methods:

- `registerTool(name, handler)`
- `unregisterTool(name)`
- `listTools()`
- `runTool(name, input)`

Tool handlers receive one input object and can return plain JSON-compatible data or a string. If the tool is used through model tool-calling, the result is serialized and injected back into the model flow.

Use local tools for lightweight client-side actions. For advanced or external integrations, prefer MCP servers.

## Configuration panel

The built-in UI opens from the public API:

```js
agent.openConfigPanel()
agent.openMcpPanel()
```

The built-in panels use English translations.

## Provider types

The profile field `providerType` selects the adapter implementation:

- `openai-compatible`
- `anthropic-native`
- `google-native`

## CORS

Since ClientAgentJS runs entirely in the browser, it requires AI providers to support **CORS** (Cross-Origin Resource Sharing). Not all providers enable CORS by default, and some require special configuration.

### Provider CORS Support

- **Anthropic**: Supports browser access when the `anthropic-dangerous-direct-browser-access` header is included. Handled automatically by the library.
- **Google (Gemini)**: Supports CORS on the generative language API. No additional configuration needed.
- **OpenAI**: Does **not** support direct browser access. Use a backend proxy or [OpenRouter](#openrouter) instead.
- **Ollama**: Requires manual CORS configuration (see below).
- **Other OpenAI-compatible providers**: CORS support varies. Check their documentation, or use OpenRouter as a unified alternative.

### When a Provider Does Not Support CORS

1. **Use your own backend proxy**: Route API requests through a server you control, then point ClientAgentJS at your proxy endpoint using an OpenAI-compatible configuration.
2. **Use OpenRouter**: [OpenRouter](https://openrouter.ai) supports CORS and provides access to models from OpenAI, Anthropic, Mistral, Meta, and many others through a single endpoint — useful when you need browser-compatible access to models whose native APIs do not support it.
3. **Use a public CORS proxy** *(development only)*: Services like `cors-anywhere` can add CORS headers to proxied requests, but are unreliable and should not be used in production.

### Ollama CORS Configuration

Ollama does not enable CORS by default. To use it with ClientAgentJS, start Ollama with the appropriate CORS headers:

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Or set the environment variable permanently:

```bash
# Linux/macOS
export OLLAMA_ORIGINS="*"
ollama serve

# Windows
set OLLAMA_ORIGINS=*
ollama serve
```

For production environments, restrict origins to your specific domain instead of `*`:

```bash
OLLAMA_ORIGINS="http://localhost:*" ollama serve
```

### MCP and CORS

MCP servers also need to support CORS when accessed from the browser. Many MCP servers are designed to run as local processes and are not built for direct browser access.

**Options:**

1. **Run MCP servers locally**: A server on `localhost` accessed from a page also on `localhost` is same-origin and avoids cross-origin restrictions entirely.
2. **Host your own MCP servers**: Configure them to include the appropriate `Access-Control-Allow-Origin` response headers.
3. **Route through a backend proxy**: Forward browser requests to MCP servers through your own proxy, keeping the MCP servers unexposed.

When adding an MCP server in the configuration panel, verify that the endpoint either supports CORS or is running on localhost.

## Examples

- [**Chat Explorer**](examples/browser-basic/): A full-featured chat interface demonstrating sessions, streaming, event logs, and configuration portability.
- [**Form Assistance**](examples/form-assistance/): Using the agent to help users fill out and improve content in standard web forms.
- [**MCP Tools**](examples/mcp-tools/): Connecting the agent to external services via the Model Context Protocol.

## API and Documentation

- [**Documentation Index**](docs/README.md)
- [**API Contract**](docs/api.md)
- [**Architecture Overview**](docs/architecture.md)

### Deployment Models

- **Direct Client-to-Provider**: The browser connects directly to OpenAI, Anthropic, or Ollama using credentials stored locally. This ensures maximum privacy and zero infrastructure costs for the developer.
- **Managed Proxy**: The developer provides an endpoint that acts as a thin proxy to inject keys or manage quotas. The library still manages the agent logic, history, and tools in the browser.
- **Local-Only**: The agent communicates with a local model (like Ollama or LM Studio) for a 100% private, offline-capable experience.

This architecture makes the project ideal for internal tools, developer-focused products, and any application where data privacy and user control are priorities.

## License

See license: [ClientAgentJS](https://github.com/FranBarInstance/ClientAgentJS)
