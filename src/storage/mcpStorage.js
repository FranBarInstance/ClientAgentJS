function safeParseObject(raw) {
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeHeaders(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  const headers = {}
  for (const [key, headerValue] of Object.entries(value)) {
    if (typeof key === "string") {
      headers[key] = String(headerValue)
    }
  }

  return headers
}

function normalizeMcpServer(id, server) {
  if (!server || typeof server !== "object") {
    throw new Error("MCP server must be an object.")
  }

  const normalizedId = String(id || server.id || "").trim()
  const name = String(server.name || "").trim()
  const transport = String(server.transport || "streamable-http").trim()
  const url = String(server.url || "").trim()

  if (!normalizedId) {
    throw new Error("MCP server id is required.")
  }

  if (!name) {
    throw new Error("MCP server name is required.")
  }

  if (!url) {
    throw new Error("MCP server url is required.")
  }

  const createdAt = server.createdAt || nowIso()

  return {
    id: normalizedId,
    name,
    transport,
    url,
    headers: normalizeHeaders(server.headers),
    enabled: server.enabled !== false,
    createdAt,
    updatedAt: nowIso()
  }
}

function sanitizeMcpMap(mcpServers) {
  const input = mcpServers && typeof mcpServers === "object" && !Array.isArray(mcpServers) ? mcpServers : {}
  const normalizedMap = {}

  for (const [id, server] of Object.entries(input)) {
    try {
      const normalizedServer = normalizeMcpServer(id, server)
      normalizedMap[normalizedServer.id] = normalizedServer
    } catch {
      // Ignore invalid persisted entries and keep the rest of the storage readable.
    }
  }

  return normalizedMap
}

export function createMcpStorage({ storage, storageKey }) {
  const mcpServersKey = `${storageKey}:mcpServers`

  function readMcpMap() {
    const normalizedMap = sanitizeMcpMap(safeParseObject(storage.getItem(mcpServersKey)))
    writeMcpMap(normalizedMap)
    return normalizedMap
  }

  function writeMcpMap(mcpMap) {
    storage.setItem(mcpServersKey, JSON.stringify(mcpMap))
  }

  return {
    saveMcpServer(id, server) {
      const mcpMap = readMcpMap()
      const normalized = normalizeMcpServer(id, server)
      mcpMap[normalized.id] = normalized
      writeMcpMap(mcpMap)
      return { ...normalized }
    },

    loadMcpServer(id) {
      if (!id) {
        return null
      }

      const mcpMap = readMcpMap()
      const server = mcpMap[String(id)]
      return server ? { ...server } : null
    },

    listMcpServers() {
      const mcpMap = readMcpMap()
      return Object.values(mcpMap)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((server) => ({ ...server }))
    },

    deleteMcpServer(id) {
      const normalizedId = String(id || "").trim()
      if (!normalizedId) {
        return false
      }

      const mcpMap = readMcpMap()
      if (!mcpMap[normalizedId]) {
        return false
      }

      delete mcpMap[normalizedId]
      writeMcpMap(mcpMap)
      return true
    },

    clearMcpServers() {
      storage.removeItem(mcpServersKey)
    },

    exportData() {
      return {
        mcpServers: readMcpMap()
      }
    },

    importData({ mcpServers }) {
      const normalizedMap = sanitizeMcpMap(mcpServers)
      writeMcpMap(normalizedMap)
    }
  }
}
