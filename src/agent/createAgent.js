import { createSession } from "./createSession.js"
import { createProvider } from "../providers/index.js"
import { createFetchClient } from "../transport/fetchClient.js"
import { createProfileStorage } from "../storage/profileStorage.js"
import { createMcpStorage } from "../storage/mcpStorage.js"
import { createLocalStorageAdapter } from "../storage/adapters/localStorage.js"
import { createSessionStorageAdapter } from "../storage/adapters/sessionStorage.js"
import { createToolRegistry } from "../tools/registry.js"
import { createMcpRegistry } from "../mcp/registry.js"
import { createMcpClient } from "../mcp/client.js"
import { openConfigPanel, openMcpPanel } from "../ui/profilePanel.js"

const STORAGE_TYPES = {
  local: createLocalStorageAdapter,
  session: createSessionStorageAdapter
}

const LOCAL_TOOL_PREFIX = "clientagentjs_local__"
const IMPORT_PROFILES_WARNING =
  "Importing profiles will replace all current profiles and MCP server settings. This action cannot be undone. Do you want to continue?"

function providerSupportsToolRuntime(providerType) {
  return providerType === "openai-compatible" || providerType === "anthropic-native"
}

function ensurePrompt(prompt) {
  const text = String(prompt || "").trim()
  if (!text) {
    throw new Error("Prompt must be a non-empty string.")
  }

  return text
}

function hasMinimumProfileFields(profile) {
  if (!profile) {
    return false
  }

  return Boolean(
    typeof profile.id === "string" &&
      profile.id.trim() &&
      typeof profile.provider === "string" &&
      profile.provider.trim() &&
      typeof profile.model === "string" &&
      profile.model.trim()
  )
}

async function loadAgentsInstructions(fetchFn, agentsMdPath) {
  const path = String(agentsMdPath || "").trim()
  if (!path) {
    return ""
  }

  try {
    const response = await fetchFn(path, { method: "GET" })
    if (!response?.ok || typeof response.text !== "function") {
      return ""
    }

    return String(await response.text())
  } catch {
    return ""
  }
}

function createRuntime({ storageType, storageKey }) {
  const storageFactory = STORAGE_TYPES[storageType]
  if (!storageFactory) {
    throw new Error(`Unsupported storageType: ${storageType}`)
  }

  const storage = storageFactory()
  const profileStorage = createProfileStorage({ storage, storageKey })
  const mcpStorage = createMcpStorage({ storage, storageKey })

  return {
    storageType,
    storage,
    profileStorage,
    mcpStorage
  }
}

export function createAgent(options = {}) {
  const defaultStorageKey = typeof globalThis !== "undefined" && globalThis.location?.host
    ? `clientagentjs_${globalThis.location.host.replace(/[^a-zA-Z0-9]/g, '_')}`
    : "clientagentjs"

  if (!options.storageKey) {
    console.warn(
      "ClientAgentJS: No explicit 'storageKey' provided. " +
      "Using a default key based on the domain. " +
      "If you host multiple apps on the same domain (e.g. github.io/app1), " +
      "it is highly recommended to pass a unique 'storageKey' to avoid data collisions."
    )
  }

  const {
    storageType = "session",
    storageKey = defaultStorageKey,
    fetch: customFetch = typeof globalThis !== "undefined" ? globalThis.fetch : null,
    agentsMd = null,
    onEvent = null,
    dialogClass = null,
    onOpenConfigPanel = null,
    onOpenMcpPanel = null
  } = options

  if (typeof customFetch !== "function") {
    throw new Error("No fetch implementation was provided.")
  }

  let runtime = createRuntime({ storageType, storageKey })
  let configPanelHandler = onOpenConfigPanel
  let mcpPanelHandler = onOpenMcpPanel

  const toolRegistry = createToolRegistry()
  const mcpRegistry = createMcpRegistry({
    listServers: () => runtime.mcpStorage.listMcpServers(),
    loadServer: (id) => runtime.mcpStorage.loadMcpServer(id)
  })
  const mcpClient = createMcpClient({
    loadServerConfig: (id) => runtime.mcpStorage.loadMcpServer(id),
    fetchFn: customFetch.bind(globalThis)
  })

  const fetchClient = createFetchClient({ fetchFn: customFetch.bind(globalThis) })
  let agentsInstructionsPromise = null

  function getAgentsInstructions() {
    if (!agentsInstructionsPromise) {
      agentsInstructionsPromise = loadAgentsInstructions(customFetch.bind(globalThis), agentsMd)
    }

    return agentsInstructionsPromise
  }

  function emit(type, payload) {
    if (typeof onEvent !== "function") {
      return
    }

    try {
      onEvent({ type, payload })
    } catch {
      // Events should never break agent behavior.
    }
  }

  function getActiveProfileOrThrow() {
    const activeProfile = runtime.profileStorage.getActiveProfile()
    if (!hasMinimumProfileFields(activeProfile)) {
      throw new Error("An active profile must be configured before calling ask or stream.")
    }

    return activeProfile
  }

  function createProviderForProfile(profile) {
    return createProvider({
      providerType: profile.providerType || "openai-compatible",
      fetchClient
    })
  }

  function getToolConfiguration(profile) {
    const localToolNames = toolRegistry.listTools()
    const enabledServerIds = Array.isArray(profile.enabledMcpServers)
      ? profile.enabledMcpServers
          .map((id) => String(id || "").trim())
          .filter((id) => id.length > 0)
      : []

    return {
      localToolNames,
      enabledServerIds
    }
  }

  function createToolRuntime(profile, signal) {
    const { localToolNames, enabledServerIds } = getToolConfiguration(profile)

    if (localToolNames.length === 0 && enabledServerIds.length === 0) {
      return null
    }

    const enabledServerSet = new Set(enabledServerIds)

    return {
      async listTools() {
        const combinedTools = []

        for (const toolName of localToolNames) {
          combinedTools.push({
            name: `${LOCAL_TOOL_PREFIX}${toolName}`,
            description: `[local] ${toolName}`,
            inputSchema: { type: "object" }
          })
        }

        for (const serverId of enabledServerIds) {
          const response = await mcpClient.listTools(serverId, { signal })
          const tools = response?.result?.tools
          if (!Array.isArray(tools)) {
            continue
          }

          for (const tool of tools) {
            const originalName = String(tool?.name || "").trim()
            if (!originalName) {
              continue
            }

            combinedTools.push({
              name: `${serverId}__${originalName}`,
              description: `[${serverId}] ${String(tool?.description || "").trim()}`.trim(),
              inputSchema: tool?.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema : { type: "object" }
            })
          }
        }

        return combinedTools
      },

      async callTool(prefixedToolName, argumentsPayload = {}) {
        const normalized = String(prefixedToolName || "").trim()
        if (normalized.startsWith(LOCAL_TOOL_PREFIX)) {
          const toolName = normalized.slice(LOCAL_TOOL_PREFIX.length)
          if (!toolName) {
            throw new Error("Invalid local tool name.")
          }

          return toolRegistry.runTool(toolName, argumentsPayload)
        }

        const separatorIndex = normalized.indexOf("__")
        if (separatorIndex <= 0) {
          throw new Error(`Invalid MCP tool name: ${normalized}`)
        }

        const serverId = normalized.slice(0, separatorIndex)
        const toolName = normalized.slice(separatorIndex + 2)

        if (!enabledServerSet.has(serverId)) {
          throw new Error(`MCP server is not enabled in this profile: ${serverId}`)
        }

        const response = await mcpClient.callTool(serverId, toolName, argumentsPayload, { signal })
        return response?.result
      }
    }
  }

  async function askWithHistory(prompt, callOptions = {}, historyMessages = []) {
    const cleanPrompt = ensurePrompt(prompt)
    const profile = getActiveProfileOrThrow()
    const provider = createProviderForProfile(profile)
    const toolRuntime = createToolRuntime(profile, callOptions.signal)

    if (toolRuntime && !providerSupportsToolRuntime(profile.providerType || "openai-compatible")) {
      throw new Error(`${profile.providerType || "unknown"} provider does not support local tools or MCP servers yet.`)
    }

    emit("request:start", {
      method: "ask",
      prompt: cleanPrompt,
      profileId: profile.id
    })

    try {
      const response = await provider.ask({
        profile,
        prompt: cleanPrompt,
        context: callOptions.context,
        historyMessages,
        signal: callOptions.signal,
        mcp: toolRuntime
      })

      emit("request:end", {
        method: "ask",
        prompt: cleanPrompt,
        profileId: profile.id,
        response
      })

      return response
    } catch (error) {
      emit("request:error", {
        method: "ask",
        prompt: cleanPrompt,
        profileId: profile.id,
        error
      })
      throw error
    }
  }

  async function* streamWithHistory(prompt, callOptions = {}, historyMessages = []) {
    const cleanPrompt = ensurePrompt(prompt)
    const profile = getActiveProfileOrThrow()
    const provider = createProviderForProfile(profile)
    const toolRuntime = createToolRuntime(profile, callOptions.signal)

    if (toolRuntime && !providerSupportsToolRuntime(profile.providerType || "openai-compatible")) {
      throw new Error(`${profile.providerType || "unknown"} provider does not support local tools or MCP servers yet.`)
    }

    emit("request:start", {
      method: "stream",
      prompt: cleanPrompt,
      profileId: profile.id
    })

    try {
      for await (const chunk of provider.stream({
        profile,
        prompt: cleanPrompt,
        context: callOptions.context,
        historyMessages,
        signal: callOptions.signal,
        mcp: toolRuntime
      })) {
        emit("token", {
          method: "stream",
          profileId: profile.id,
          chunk
        })

        yield chunk
      }

      emit("request:end", {
        method: "stream",
        prompt: cleanPrompt,
        profileId: profile.id
      })
    } catch (error) {
      emit("request:error", {
        method: "stream",
        prompt: cleanPrompt,
        profileId: profile.id,
        error
      })
      throw error
    }
  }

  function exportProfiles() {
    const profileData = runtime.profileStorage.exportData()
    const mcpData = runtime.mcpStorage.exportData()

    return JSON.stringify(
      {
        profiles: profileData.profiles,
        activeProfile: profileData.activeProfile,
        mcpServers: mcpData.mcpServers
      },
      null,
      2
    )
  }

  function confirmProfileImport() {
    if (typeof globalThis.confirm !== "function") {
      throw new Error("importProfiles requires a confirmation dialog to warn before replacing existing settings.")
    }

    return globalThis.confirm(IMPORT_PROFILES_WARNING)
  }

  function importProfiles(jsonString) {
    if (!jsonString || typeof jsonString !== "string") {
      throw new Error("A JSON string is required for importProfiles.")
    }

    let parsed
    try {
      parsed = JSON.parse(jsonString)
    } catch {
      throw new Error("Invalid JSON format for profiles import.")
    }

    if (!parsed || typeof parsed !== "object" || !parsed.profiles || typeof parsed.profiles !== "object") {
      throw new Error("The provided JSON is not a valid ClientAgentJS configuration file.")
    }

    if (!confirmProfileImport()) {
      return false
    }

    const profiles = parsed.profiles
    const activeProfile = typeof parsed.activeProfile === "string" ? parsed.activeProfile : null
    const mcpServers = parsed.mcpServers && typeof parsed.mcpServers === "object" ? parsed.mcpServers : {}

    runtime.profileStorage.importData({ profiles, activeProfile })
    runtime.mcpStorage.importData({ mcpServers })

    emit("profile:imported", {
      profileCount: Object.keys(profiles).length,
      mcpServerCount: Object.keys(mcpServers).length,
      activeProfile
    })

    return true
  }

  function migrateStorage(nextStorageType) {
    if (!STORAGE_TYPES[nextStorageType]) {
      throw new Error(`Unsupported storageType: ${nextStorageType}`)
    }

    if (nextStorageType === runtime.storageType) {
      return runtime.storageType
    }

    const snapshot = {
      profileData: runtime.profileStorage.exportData(),
      mcpServers: runtime.mcpStorage.exportData().mcpServers
    }

    const previous = runtime
    const nextRuntime = createRuntime({ storageType: nextStorageType, storageKey })

    try {
      nextRuntime.profileStorage.importData({
        profiles: snapshot.profileData.profiles,
        activeProfile: snapshot.profileData.activeProfile
      })
      nextRuntime.mcpStorage.importData({ mcpServers: snapshot.mcpServers })

      const verifyData = nextRuntime.profileStorage.exportData()
      if (Object.keys(snapshot.profileData.profiles).length > 0 && Object.keys(verifyData.profiles).length === 0) {
        throw new Error("Data did not persist correctly during migration.")
      }
    } catch (err) {
      throw new Error(`Storage migration failed: ${err.message}`)
    }

    previous.profileStorage.clearProfiles()
    previous.mcpStorage.clearMcpServers()

    runtime = nextRuntime

    emit("storage:changed", {
      storageType: nextStorageType
    })

    return runtime.storageType
  }

  const agent = {
    isReady() {
      return hasMinimumProfileFields(runtime.profileStorage.getActiveProfile())
    },

    ask(prompt, callOptions = {}) {
      return askWithHistory(prompt, callOptions, [])
    },

    stream(prompt, callOptions = {}) {
      return streamWithHistory(prompt, callOptions, [])
    },

    createSession() {
      return createSession({
        askWithHistory,
        streamWithHistory,
        loadAgentsInstructions: getAgentsInstructions
      })
    },

    saveProfile(id, profile) {
      const saved = runtime.profileStorage.saveProfile(id, profile)
      emit("profile:saved", { id: saved.id })
      return saved
    },

    loadProfile(id) {
      return runtime.profileStorage.loadProfile(id)
    },

    listProfiles() {
      return runtime.profileStorage.listProfiles()
    },

    deleteProfile(id) {
      const deleted = runtime.profileStorage.deleteProfile(id)
      if (deleted) {
        emit("profile:deleted", { id })
      }
      return deleted
    },

    clearProfiles() {
      runtime.profileStorage.clearProfiles()
      emit("profile:cleared", {})
    },

    setActiveProfile(id) {
      const activeId = runtime.profileStorage.setActiveProfile(id)
      emit("profile:active", { id: activeId })
      return activeId
    },

    getActiveProfile() {
      return runtime.profileStorage.getActiveProfile()
    },

    exportProfiles,
    importProfiles,

    setStorageType(type) {
      return migrateStorage(type)
    },

    saveMcpServer(id, server) {
      const saved = runtime.mcpStorage.saveMcpServer(id, server)
      emit("mcp:saved", { id: saved.id })
      return saved
    },

    loadMcpServer(id) {
      return runtime.mcpStorage.loadMcpServer(id)
    },

    listMcpServers() {
      return runtime.mcpStorage.listMcpServers()
    },

    deleteMcpServer(id) {
      const deleted = runtime.mcpStorage.deleteMcpServer(id)
      if (deleted) {
        emit("mcp:deleted", { id })
      }
      return deleted
    },

    clearMcpServers() {
      runtime.mcpStorage.clearMcpServers()
      emit("mcp:cleared", {})
    },

    openConfigPanel() {
      if (typeof configPanelHandler === "function") {
        return configPanelHandler(agent)
      }

      return openConfigPanel({ agent, dialogClass })
    },

    openMcpPanel() {
      if (typeof mcpPanelHandler === "function") {
        return mcpPanelHandler(agent)
      }

      return openMcpPanel({ agent, dialogClass })
    },

    setConfigPanelHandler(handler) {
      if (handler != null && typeof handler !== "function") {
        throw new Error("Config panel handler must be a function or null.")
      }

      configPanelHandler = handler
    },

    setMcpPanelHandler(handler) {
      if (handler != null && typeof handler !== "function") {
        throw new Error("MCP panel handler must be a function or null.")
      }

      mcpPanelHandler = handler
    },

    registerTool: toolRegistry.registerTool,
    unregisterTool: toolRegistry.unregisterTool,
    listTools: toolRegistry.listTools,
    runTool: toolRegistry.runTool,

    listConfiguredMcpServers: mcpRegistry.listConfiguredServers,
    getMcpServerConfig: mcpRegistry.getServerConfig,
    requestMcp: mcpClient.request,
    initializeMcp: mcpClient.initialize,
    listMcpTools: mcpClient.listTools,
    callMcpTool: mcpClient.callTool
  }

  return agent
}
