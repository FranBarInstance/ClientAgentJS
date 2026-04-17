import { createAgent } from "../../dist/clientagentjs.esm.js"

const outputEl = document.querySelector("#output")
const statusEl = document.querySelector("#status")
const serverUrlInput = document.querySelector("#server-url")
const promptInput = document.querySelector("#prompt")

const DEMO_PROFILE_ID = "mcp-demo-profile"
const DEMO_SERVER_ID = "mcp-demo-server"

const agent = createAgent({
  storageType: "session",
  storageKey: "cajs_mcp_tools",
  dialogClass: "mcp-tools-demo",
  onEvent(event) {
    if (event.type === "request:start") {
      setStatus(`Request started with profile: ${event.payload.profileId}`)
    }

    if (event.type === "request:end") {
      setStatus(`Request finished with profile: ${event.payload.profileId}`)
    }

    if (event.type === "request:error") {
      const message = event.payload?.error?.message || "Unknown error"
      setStatus(`Request failed: ${message}`)
    }
  }
})

function setOutput(value) {
  outputEl.textContent = value
}

function setStatus(value) {
  statusEl.textContent = value
}

function readServerUrl() {
  const serverUrl = String(serverUrlInput.value || "").trim()
  if (!serverUrl) {
    throw new Error("Write an MCP server URL first.")
  }

  return serverUrl
}

function getActiveProfileWithServer(serverId) {
  const activeProfile = agent.getActiveProfile()
  if (!activeProfile) {
    throw new Error("There is no active profile yet.")
  }

  const enabledServerIds = Array.isArray(activeProfile.enabledMcpServers)
    ? activeProfile.enabledMcpServers
    : []

  if (enabledServerIds.includes(serverId)) {
    return activeProfile
  }

  const nextProfile = {
    ...activeProfile,
    enabledMcpServers: [...enabledServerIds, serverId]
  }

  agent.saveProfile(nextProfile.id, nextProfile)
  agent.setActiveProfile(nextProfile.id)
  return nextProfile
}

function saveDemoMcpServer() {
  const url = readServerUrl()

  const saved = agent.saveMcpServer(DEMO_SERVER_ID, {
    id: DEMO_SERVER_ID,
    name: "Example MCP Server",
    transport: "streamable-http",
    url,
    headers: {},
    enabled: true
  })

  setStatus(`Saved MCP server ${saved.id} -> ${saved.url}`)
  return saved.id
}

function createDemoProfile() {
  const profile = agent.saveProfile(DEMO_PROFILE_ID, {
    id: DEMO_PROFILE_ID,
    name: "MCP Demo (Ollama)",
    provider: "openai-compatible",
    providerType: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
    apiKey: "",
    model: "llama3.2",
    systemPrompt: "You are a concise assistant. Use MCP tools when they are helpful.",
    enabledMcpServers: [DEMO_SERVER_ID]
  })

  agent.setActiveProfile(profile.id)
  setStatus(`Created active profile ${profile.id} using ${profile.model}`)
}

async function runInitialize() {
  const serverId = saveDemoMcpServer()
  const response = await agent.initializeMcp(serverId)

  setOutput(JSON.stringify(response.result, null, 2))
  setStatus(`Initialized MCP server ${serverId}`)
}

async function runListTools() {
  const serverId = saveDemoMcpServer()
  const response = await agent.listMcpTools(serverId)

  setOutput(JSON.stringify(response.result, null, 2))
  setStatus(`Listed MCP tools for ${serverId}`)
}

async function runCallSum() {
  const serverId = saveDemoMcpServer()
  const response = await agent.callMcpTool(serverId, "calculate_sum", {
    numbers: [12, 18, 30]
  })

  setOutput(JSON.stringify(response.result, null, 2))
  setStatus(`Called calculate_sum on ${serverId}`)
}

async function runCallTime() {
  const serverId = saveDemoMcpServer()
  const response = await agent.callMcpTool(serverId, "get_current_time", {})

  setOutput(JSON.stringify(response.result, null, 2))
  setStatus(`Called get_current_time on ${serverId}`)
}

async function runAskWithMcp() {
  const serverId = saveDemoMcpServer()
  createDemoProfile()
  getActiveProfileWithServer(serverId)

  const prompt = String(promptInput.value || "").trim()
  if (!prompt) {
    throw new Error("Write a prompt before calling ask().")
  }

  setOutput("")
  setStatus("Running ask() with MCP-enabled profile...")

  const response = await agent.ask(prompt, {
    context: `Current page: ${location.href}`
  })

  setOutput(response.text || JSON.stringify(response.raw, null, 2))
  setStatus("ask() completed")
}

function checkActiveProfile() {
  const activeProfile = agent.getActiveProfile()
  if (!activeProfile) {
    setStatus("There is no active profile.")
    return
  }

  setOutput(JSON.stringify(activeProfile, null, 2))
  setStatus(`Active profile: ${activeProfile.id}`)
}

document.querySelector("#btn-save-server").addEventListener("click", () => {
  try {
    saveDemoMcpServer()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to save MCP server")
  }
})

document.querySelector("#btn-open-mcp").addEventListener("click", () => {
  agent.openMcpPanel()
})

document.querySelector("#btn-open-config").addEventListener("click", () => {
  agent.openConfigPanel()
})

document.querySelector("#btn-create-demo").addEventListener("click", () => {
  try {
    saveDemoMcpServer()
    createDemoProfile()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to create demo profile")
  }
})

document.querySelector("#btn-init").addEventListener("click", async () => {
  try {
    await runInitialize()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "initialize failed")
  }
})

document.querySelector("#btn-list-tools").addEventListener("click", async () => {
  try {
    await runListTools()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "tools/list failed")
  }
})

document.querySelector("#btn-call-sum").addEventListener("click", async () => {
  try {
    await runCallSum()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "calculate_sum failed")
  }
})

document.querySelector("#btn-call-time").addEventListener("click", async () => {
  try {
    await runCallTime()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "get_current_time failed")
  }
})

document.querySelector("#btn-ask").addEventListener("click", async () => {
  try {
    await runAskWithMcp()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "ask() with MCP failed")
  }
})

document.querySelector("#btn-check").addEventListener("click", () => {
  try {
    checkActiveProfile()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "check failed")
  }
})

setStatus("Save the MCP server or create the demo profile to begin.")
