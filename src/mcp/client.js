function createJsonRpcPayload({ method, params, id }) {
  return {
    jsonrpc: "2.0",
    id: id || `mcp-${Date.now()}`,
    method,
    params: params || {}
  }
}

function ensureServerConfig(serverId, server) {
  if (!server) {
    throw new Error(`MCP server not found: ${serverId}`)
  }

  if (!server.enabled) {
    throw new Error(`MCP server is disabled: ${serverId}`)
  }

  if (!server.url || !String(server.url).trim()) {
    throw new Error(`MCP server url is required: ${serverId}`)
  }
}

export function createMcpClient({ loadServerConfig, fetchFn }) {
  if (typeof loadServerConfig !== "function") {
    throw new Error("createMcpClient requires loadServerConfig function.")
  }

  if (typeof fetchFn !== "function") {
    throw new Error("createMcpClient requires fetchFn function.")
  }

  async function request({ serverId, method, params, id, signal } = {}) {
      const normalizedServerId = String(serverId || "").trim()
      const normalizedMethod = String(method || "").trim()

      if (!normalizedServerId) {
        throw new Error("MCP request requires serverId.")
      }

      if (!normalizedMethod) {
        throw new Error("MCP request requires method.")
      }

      const server = loadServerConfig(normalizedServerId)
      ensureServerConfig(normalizedServerId, server)

      const payload = createJsonRpcPayload({
        method: normalizedMethod,
        params,
        id
      })

      let response
      try {
        response = await fetchFn(server.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(server.headers || {})
          },
          body: JSON.stringify(payload),
          signal
        })
      } catch (err) {
        throw new Error(`MCP Network Error (${server.url}): This is often caused by CORS policies or the server being unreachable. Check your server's CORS configuration. Original error: ${err.message}`)
      }

      if (!response.ok) {
        let detail = ""
        try {
          const errorJson = await response.json()
          if (errorJson?.error?.message) {
            detail = `: ${errorJson.error.message}`
          }
        } catch {
          // Ignore parse failures and keep generic HTTP status error.
        }

        throw new Error(`MCP request failed with status ${response.status}${detail}.`)
      }

      const json = await response.json()
      if (json?.error) {
        const code = json.error.code != null ? ` (${json.error.code})` : ""
        throw new Error(`MCP error${code}: ${json.error.message || "Unknown error"}`)
      }

      return {
        id: json?.id,
        result: json?.result,
        raw: json
      }
  }

  async function initialize(serverId, options = {}) {
    return request({
        serverId,
        method: "initialize",
        params: options.params || {},
        signal: options.signal
      })
  }

  async function listTools(serverId, options = {}) {
    return request({
        serverId,
        method: "tools/list",
        params: options.params || {},
        signal: options.signal
      })
  }

  async function callTool(serverId, name, argumentsPayload = {}, options = {}) {
    return request({
        serverId,
        method: "tools/call",
        params: {
          name,
          arguments: argumentsPayload
        },
        signal: options.signal
      })
  }

  return {
    request,
    initialize,
    listTools,
    callTool
  }
}
