/**
 * ClientAgentJS Example - Chat Explorer
 * See license: https://github.com/FranBarInstance/ClientAgentJS
 */

import { createAgent } from "../../dist/clientagentjs.esm.js";

const AGENTS_MD_PATH = "./AGENTS.md";
const DEMO_SYSTEM_PROMPT = "You are the demo assistant for the ClientAgentJS browser example.";

// --- DOM Elements ---
const promptInput = document.querySelector("#prompt");
const messagesEl = document.querySelector("#messages");
const eventLogEl = document.querySelector("#event-log");
const statusBadgeEl = document.querySelector("#agent-status-badge");
const agentsMdBadgeEl = document.querySelector("#agents-md-badge");
const btnSend = document.querySelector("#btn-send");
const btnStop = document.querySelector("#btn-stop");

// --- State ---
let currentSession = null;
let abortController = null;

// --- Agent Initialization ---
const agent = createAgent({
  storageType: "session", // Initial storage
  storageKey: "cajs_browser_basic",
  agentsMd: AGENTS_MD_PATH,
  dialogClass: "browser-basic-demo",
  onEvent(event) {
    logEvent(event);

    if (event.type === "request:start") {
      btnStop.disabled = false;
    }

    if (event.type === "request:end" || event.type === "request:error") {
      btnStop.disabled = true;
      updateStatus();
    }
  }
});

// --- Core Chat Functions ---

function showAgentsMdConfigured() {
  if (!agentsMdBadgeEl) {
    return;
  }

  agentsMdBadgeEl.textContent = "AGENTS.md configured";
  agentsMdBadgeEl.className = "status-badge active";
}

async function sendMessage() {
  const text = promptInput.value.trim();
  if (!text) return;
  if (!agent.isReady()) {
    agent.openConfigPanel();
    return;
  }

  // Clear input and add user message
  promptInput.value = "";
  addMessage("user", text);

  // Ensure we have a session
  if (!currentSession) {
    currentSession = agent.createSession();
    addMessage("system", "New session started.");
  }

  // Setup cancellation
  abortController = new AbortController();

  // Create agent message placeholder with thinking state
  const agentMsgEl = addMessage("agent", "");
  agentMsgEl.textContent = "Agent is thinking";
  agentMsgEl.classList.add("thinking");
  let fullText = "";

  try {
    // We use stream() for a better UX
    const stream = currentSession.stream(text, {
      signal: abortController.signal,
      context: `User is viewing: ${document.title} (${location.href}). The current time is ${new Date().toLocaleTimeString()}.`
    });

    for await (const chunk of stream) {
      if (fullText === "") {
        agentMsgEl.classList.remove("thinking");
        agentMsgEl.innerHTML = "";
      }
      fullText += chunk.text;
      agentMsgEl.innerHTML = marked.parse(fullText);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      addMessage("system", "Response stopped by user.");
    } else {
      console.error(error);
      addMessage("system", `Error: ${error.message}`);
    }
  } finally {
    // If we finished without any text (e.g. error or empty response),
    // we should at least remove the thinking class
    agentMsgEl.classList.remove("thinking");
    if (!fullText && agentMsgEl.textContent === "Agent is thinking") {
      agentMsgEl.textContent = "(No response)";
    }
    abortController = null;
  }
}

function stopGeneration() {
  if (abortController) {
    abortController.abort();
  }
}

function createNewSession() {
  currentSession = agent.createSession();
  addMessage("system", "Session reset. History cleared for new messages.");
}

function clearChat() {
  messagesEl.innerHTML = '<div class="message system">Chat cleared.</div>';
  currentSession = null;
}

// --- UI Helpers ---

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `message ${role}`;

  if (role === "agent" && text) {
    el.innerHTML = marked.parse(text);
  } else {
    el.textContent = text;
  }

  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function logEvent(event) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${event.type}`;
  eventLogEl.prepend(entry);
}

function updateStatus() {
  const ready = agent.isReady();
  const profile = agent.getActiveProfile();

  statusBadgeEl.textContent = ready ? `Ready: ${profile.name}` : "Not Configured";
  statusBadgeEl.className = `status-badge ${ready ? "ready" : "not-ready"}`;
}

// showTyping removed in favor of in-bubble thinking indicator

// --- API Feature Demos ---

function createOllamaDemoProfile() {
  const profileId = "demo-ollama";
  agent.saveProfile(profileId, {
    id: profileId,
    name: "Local Ollama",
    provider: "openai-compatible",
    model: "llama3.2", // Common model
    apiKey: "", // not needed for local Ollama
    baseURL: "http://localhost:11434/v1",
    systemPrompt: DEMO_SYSTEM_PROMPT
  });
  agent.setActiveProfile(profileId);
  updateStatus();
  addMessage("system", "Created and activated Ollama demo profile.");
}

function handleExport() {
  const data = agent.exportProfiles();
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `client-agent-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        await agent.importProfiles(event.target.result);
        updateStatus();
        addMessage("system", "Configuration imported successfully.");
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// --- Event Listeners ---

btnSend.addEventListener("click", sendMessage);
btnStop.addEventListener("click", stopGeneration);
document.querySelector("#btn-new-chat").addEventListener("click", createNewSession);
document.querySelector("#btn-clear").addEventListener("click", clearChat);
document.querySelector("#btn-check").addEventListener("click", updateStatus);

document.querySelector("#btn-open-config").addEventListener("click", () => agent.openConfigPanel());
document.querySelector("#btn-open-mcp").addEventListener("click", () => agent.openMcpPanel());
document.querySelector("#btn-quick-ollama").addEventListener("click", createOllamaDemoProfile);

document.querySelector("#btn-export").addEventListener("click", handleExport);
document.querySelector("#btn-import").addEventListener("click", handleImport);

// Storage Toggle
document.querySelectorAll('input[name="storage-type"]').forEach(input => {
  input.addEventListener("change", (e) => {
    agent.setStorageType(e.target.value);
    addMessage("system", `Storage changed to: ${e.target.value}`);
  });
});

// Shortcut: Shift+Enter to send
promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Initial Status
updateStatus();
showAgentsMdConfigured();
if (!agent.isReady()) {
  addMessage("system", "💡 Tip: Use 'Quick Ollama' if you have Ollama running locally, or open Profiles to add your OpenAI/Anthropic key.");
}
