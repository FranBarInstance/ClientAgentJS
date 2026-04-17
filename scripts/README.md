# Tools and Scripts - ClientAgentJS

This directory (`scripts/`) contains utilities, build scripts, and test servers useful for the development and testing of the ClientAgentJS library.

Below, the available tools are described, their purpose, and how to use them.

---

## 1. Build Script (`build.mjs`)

This script packages the entire library into a single ESM module (`dist/clientagentjs.esm.js`) and also generates its minified version. It is built exclusively using Node.js standard library, so it does not require heavy bundlers like Webpack, Vite, or Rollup to operate.

### Features
- Dynamically resolves dependencies of all internal modules (`/src`).
- Packages the code by hiding modules in closures (IIFE) and exposing only the public API (`createAgent`).
- Minifies the code by merging lines and cleaning spaces.
- Completely written in Vanilla NodeJS, zero dependencies required in `package.json`.

### Usage

Normally, you should call it from NPM, located in the project root folder:
```bash
npm run build
```

Alternatively, you can run it directly if you are in the root:
```bash
node scripts/build.mjs
```

### Results
The script automatically generates or overwrites files in ES Module format within the `/dist` folder:
- `dist/clientagentjs.esm.js` (Readable format, ideal for debugging and development)
- `dist/clientagentjs.esm.min.js` (Minified format recommended for web production environment)

---

## 2. Example MCP Server (`mcp_server.py`)

Basic Model Context Protocol (MCP) type server implemented in Python. It is designed to start easily to test asynchronous calls of remote "Tools" from `ClientAgentJS`.

### Features
- **Zero Dependencies (Vanilla):** Written only with Python standard library (`http.server`). Works on Python 3.8+ without requiring installations like `pip install`.
- **Full CORS enabled:** Explicitly incorporates `Access-Control-Allow-*` response headers and precise preflight (`OPTIONS`) interceptors to accept native AJAX calls from JavaScript-based clients running in a browser.
- **Compatible with ClientAgentJS:** Works in harmony with the internal client implemented in `src/mcp/client.js`.

### Run the server

Locate yourself in this script directory and launch it:
```bash
cd scripts/
python mcp_server.py
```

### Endpoints (Routes)
Once started, you will have the following routes on local network:
- Base port: `http://localhost:8000`
- **MCP Endpoint (JSON-RPC):** `http://localhost:8000/mcp`
- Health check (Check heartbeat and CORS tests): `http://localhost:8000/health`

### Integrated Remote Tools
The server offers these "Tools" ready to be dispatched by an AI:

| Name | Description |
|------|-------------|
| `get_server_info` | Returns information about the environment, version, and status of the test server. |
| `calculate_sum` | Sums a list of numerical data checking type conversions. |
| `get_current_time` | Transmits a timestamp or current-time to temporally locate the AI. |
| `translate_to_glorbish` | Demonstration tool for text processing that converts any phrase to the joke language _glorbish_. |

### Example Configuration in ClientAgentJS

If you are in the Optional UI (ProfilePanel), the URL you must enter in the MCP manager is: `http://localhost:8000/mcp`.

If you use the program programmatically, the exact configuration is as follows:
```javascript
import { createAgent } from "../dist/clientagentjs.esm.js"

const agent = createAgent()

// 1. First save the test server
agent.saveMcpServer("example-server", {
  id: "example-server",
  name: "Example MCP Server",
  url: "http://localhost:8000/mcp" // Pointing to the POST JSON-RPC endpoint
})

// 2. Assign it to one of our Profiles by enabling it
agent.saveProfile("demo", {
  id: "demo",
  name: "Demo with MCP",
  provider: "openai-compatible",
  baseURL: "http://localhost:11434/v1", // Example AI server (Ollama)
  model: "llama3.2",
  enabledMcpServers: ["example-server"]
})

agent.setActiveProfile("demo")
```
> ⚠️ **Production note:** In the local environment it allows traffic to generalized origins `("*")`. In a real production environment, you must restructure the MCP server to limit Origin headers to your own domains (`Access-Control-Allow-Origin: mysite.com`).

---

See license: [ClientAgentJS](https://github.com/FranBarInstance/ClientAgentJS)
