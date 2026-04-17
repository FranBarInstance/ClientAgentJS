# ClientAgentJS Chat Explorer (Browser Basic)

This example is a comprehensive "Chat Explorer" that demonstrates the majority of the `ClientAgentJS` API features in a real-world chat application context.

## Features Demonstrated

- **Multi-turn Chat Sessions**: Uses `agent.createSession()` to maintain conversation history.
- **Streaming with Cancellation**: Implements `agent.stream()` with an `AbortController` for real-time responses and user-controlled stopping.
- **Markdown Rendering**: Automatic parsing of agent responses using the `marked` library.
- **Dynamic Context Injection**: Automatically injects page metadata (URL, title, time) into every request.
- **Profile Management**: Full UI for creating, editing, and switching between AI provider profiles.
- **MCP Server Integration**: Configuration and management of Model Context Protocol servers.
- **Event Logging**: Real-time display of internal library events (`request:start`, `token`, `request:error`, etc.).
- **Configuration Portability**: Export and Import your entire setup (profiles and MCP servers) as JSON.
- **Persistence Control**: Switch between `sessionStorage` and `localStorage` at runtime.

## How to Run

1. **Build the library** from the root directory:
   ```bash
   npm run build
   ```

2. **Serve the project** using a local static server:
   ```bash
   # Example using Python
   python3 -m http.server 8000
   ```

3. **Open the example** in your browser:
   - `http://localhost:8000/examples/browser-basic/`

## Quick Start Flow

1. **Configure a Profile**:
   - If you have [Ollama](https://ollama.com/) running locally, click **"Quick Ollama"** to auto-create a profile.
   - Otherwise, click **"Profiles"** and add your own OpenAI, Anthropic, or OpenAI-compatible credentials.
2. **Start Chatting**: Type a message and press **Send** (or `Shift+Enter`).
3. **Monitor Activity**: Watch the **Event Log** sidebar to see how the library handles requests and tokens.
4. **Try Portability**: Configure your setup and then click **"Export Config"** to save it as a file.

## Technical Details

- **Imports**: The example imports directly from `../../dist/clientagentjs.esm.js`.
- **UI Architecture**: Uses a modular vanilla JavaScript approach with CSS variables for a modern, responsive design.
- **Dependencies**: Uses `marked.min.js` (via CDN) for Markdown parsing.
