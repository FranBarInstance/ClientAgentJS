import { createAgent } from "../../dist/clientagentjs.esm.js"

const statusEl = document.querySelector("#status")
const previewEl = document.querySelector("#preview")

const agent = createAgent({
  storageType: "session",
  storageKey: "cajs_form_assistance",
  dialogClass: "form-assistance-demo",
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

function setStatus(text) {
  statusEl.textContent = text
}

function setPreview(text) {
  previewEl.textContent = text
}

function appendPreview(text) {
  previewEl.textContent += text
}

function createOllamaDemoProfile() {
  const profileId = "form-assistance-demo"

  const saved = agent.saveProfile(profileId, {
    id: profileId,
    name: "Form Assistance (Ollama)",
    provider: "openai-compatible",
    providerType: "openai-compatible",
    model: "llama3.2",
    apiKey: "",
    baseURL: "http://localhost:11434/v1",
    systemPrompt: "You are a concise assistant embedded inside a web form. Write practical, production-ready text.",
    enabledMcpServers: []
  })

  if (!saved || saved.id !== profileId) {
    throw new Error("Could not save the demo profile.")
  }

  agent.setActiveProfile(profileId)
  setStatus("Demo Ollama profile created and set as active.")
}

function getFormValues() {
  return {
    productName: String(document.querySelector("#product-name").value || "").trim(),
    audience: String(document.querySelector("#audience").value || "").trim(),
    bio: String(document.querySelector("#bio").value || "").trim(),
    description: String(document.querySelector("#description").value || "").trim(),
    support: String(document.querySelector("#support").value || "").trim()
  }
}

function buildTask(action) {
  const values = getFormValues()

  if (action === "bio" || action === "bio-stream") {
    return {
      target: document.querySelector("#bio"),
      prompt: "Rewrite the short bio so it sounds warm, credible and polished.",
      context: [
        `Current bio: ${values.bio}`,
        `Product: ${values.productName}`,
        `Audience: ${values.audience}`
      ].join("\n")
    }
  }

  if (action === "description" || action === "description-stream") {
    return {
      target: document.querySelector("#description"),
      prompt: "Write a compelling ecommerce description for this product in 2 short paragraphs.",
      context: [
        `Product name: ${values.productName}`,
        `Audience: ${values.audience}`,
        `Current notes: ${values.description}`
      ].join("\n")
    }
  }

  return {
    target: document.querySelector("#support"),
    prompt: "Draft a helpful customer support reply that resolves the issue clearly and politely.",
    context: [
      `Product name: ${values.productName}`,
      `Audience: ${values.audience}`,
      `Support situation: ${values.support}`
    ].join("\n")
  }
}

async function runAsk(action) {
  const task = buildTask(action)
  setPreview("")
  setStatus("Running ask()...")

  const response = await agent.ask(task.prompt, {
    context: task.context
  })

  task.target.value = response.text
  setPreview(response.text)
  setStatus("ask() completed and field updated.")
}

async function runStream(action) {
  const task = buildTask(action)
  setPreview("")
  setStatus("Running stream()...")

  let fullText = ""
  for await (const chunk of agent.stream(task.prompt, {
    context: task.context
  })) {
    fullText += chunk.text
    setPreview(fullText)
  }

  task.target.value = fullText
  setStatus("stream() completed and field updated.")
}

function checkAgentState() {
  if (!agent.isReady()) {
    setStatus("Agent is not ready. Open the profile panel or create the demo profile.")
    return
  }

  const active = agent.getActiveProfile()
  setStatus(`Agent ready with profile: ${active.id} (${active.provider} / ${active.model})`)
}

document.querySelector("#btn-open-config").addEventListener("click", () => {
  agent.openConfigPanel()
})

document.querySelector("#btn-check").addEventListener("click", () => {
  checkAgentState()
})

document.querySelector("#btn-demo-profile").addEventListener("click", () => {
  try {
    createOllamaDemoProfile()
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to create the demo profile")
  }
})

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = String(button.getAttribute("data-action") || "")

    try {
      if (action.endsWith("-stream")) {
        await runStream(action)
      } else {
        await runAsk(action)
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI request failed")
    }
  })
})

setStatus("Open the profile panel or create the Ollama demo profile to begin.")
